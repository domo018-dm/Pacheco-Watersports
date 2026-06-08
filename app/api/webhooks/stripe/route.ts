import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/resend'
import { buildBookingConfirmationEmail } from '@/lib/emails/booking-confirmation'

// Stripe delivers webhooks multiple times on network errors. Every handler path
// must be idempotent — processing the same event twice must not corrupt state.
//
// Idempotency strategy:
//   - checkout.session.completed: UPDATE WHERE status='pending' — if already
//     'confirmed', 0 rows update, we return 200 (Stripe stops retrying).
//   - checkout.session.expired: UPDATE WHERE status='pending' — safe same way.
//
// NEVER return a non-2xx for a valid but already-processed event; Stripe would retry forever.

// Craft type label derived from the same logic as the checkout route / modal
function craftTypeLabel(session: Stripe.Checkout.Session): string {
  // We embed craft_type in metadata so we can reconstruct the label without a DB query
  const t = session.metadata?.craft_type
  if (t === 'ski')    return 'Jet Ski'
  if (t === 'boat')   return session.metadata?.craft_class === 'CRUISE' ? 'Pontoon' : 'Boat'
  return 'Watercraft'
}

async function sendConfirmationEmail(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {}

  const to           = session.customer_email
  const customerName = meta.customer_name    ?? ''
  const craftName    = meta.craft_name       ?? 'your craft'
  const startTime    = meta.start_time
  const endTime      = meta.end_time
  const durationHrs  = meta.duration_hours ? Number(meta.duration_hours) : 0
  const reservId     = meta.reservation_id  ?? ''

  if (!to || !startTime || !endTime || !reservId) {
    console.warn('[webhook/email] missing fields — skipping email', { to, startTime, endTime, reservId })
    return
  }

  const { subject, html, text } = buildBookingConfirmationEmail({
    reservationId: reservId,
    customerName,
    customerEmail: to,
    craftName,
    craftType:     craftTypeLabel(session),
    startTime,
    endTime,
    durationHours: durationHrs,
    amountCents:   session.amount_total ?? 0,
  })

  const fromEmail = process.env.RESEND_FROM_ADDRESS ?? 'onboarding@resend.dev'
  const from = `Pacheco Watersports <${fromEmail}>`

  const { error } = await getResend().emails.send({ from, to, subject, html, text })

  if (error) {
    // Non-fatal: reservation is already confirmed. Log for ops visibility but
    // do NOT throw — a failed email must never un-confirm a paid booking.
    console.error('[webhook] email_delivery_failed', { to, reservId, error })
  } else {
    console.log(`[webhook] confirmation email sent → ${to} (reservation ${reservId})`)
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Read raw body (must not be parsed — signature covers exact bytes) ───
  const rawBody = await req.text()
  const sig     = req.headers.get('stripe-signature') ?? ''

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set — rejecting all requests')
    return NextResponse.json({ error: 'webhook_secret_not_configured' }, { status: 500 })
  }

  // ── 2. Verify Stripe signature — rejects forged/unsigned requests ──────────
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('[webhook] signature verification failed:', msg)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const db = createServiceClient() // service role bypasses RLS for UPDATE

  // ── 3. Handle events ───────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Payment succeeded ──────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // payment_status can be 'paid' (card) or 'unpaid' (async methods like bank transfer).
        // Only confirm when payment is actually received.
        if (session.payment_status !== 'paid') {
          console.log('[webhook] session completed but not yet paid — waiting for payment event')
          break
        }

        const reservationId   = session.metadata?.reservation_id
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null

        if (!reservationId) {
          console.error('[webhook] checkout.session.completed: no reservation_id in metadata', session.id)
          break
        }

        // Idempotent: WHERE status='pending' means re-delivery is a no-op.
        // .select('id') returns the rows actually updated — empty array = already confirmed.
        const { error, data: confirmed } = await db
          .from('reservations')
          .update({
            status:                    'confirmed',
            payment_status:            'paid',
            stripe_payment_intent_id:  paymentIntentId,
            amount_cents:              session.amount_total ?? null,
          })
          .eq('id', reservationId)
          .eq('status', 'pending')   // ← idempotency guard
          .select('id')

        if (error) {
          console.error('[webhook] failed to confirm reservation:', error.message)
          // Return 500 so Stripe retries — the reservation isn't confirmed yet
          return NextResponse.json({ error: 'db_error' }, { status: 500 })
        }

        console.log(`[webhook] reservation ${reservationId} confirmed (session ${session.id})`)

        // Send confirmation email only when this delivery actually flipped the row.
        // confirmed.length === 0 means already confirmed (re-delivery) — skip the email.
        if ((confirmed?.length ?? 0) > 0) {
          try {
            await sendConfirmationEmail(session)
          } catch (emailErr) {
            // Catch any unexpected throw from sendConfirmationEmail itself.
            // Reservation is confirmed — do not fail the webhook over email.
            console.error('[webhook] email_delivery_failed (uncaught)', emailErr)
          }
        } else {
          console.log(`[webhook] reservation ${reservationId} already confirmed — skipping email`)
        }

        break
      }

      // ── Checkout session expired without payment ───────────────────────────
      case 'checkout.session.expired': {
        const session       = event.data.object as Stripe.Checkout.Session
        const reservationId = session.metadata?.reservation_id
        if (!reservationId) break

        const { error } = await db
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', reservationId)
          .eq('status', 'pending')   // ← idempotency guard

        if (error) console.error('[webhook] failed to cancel expired reservation:', error.message)
        else console.log(`[webhook] reservation ${reservationId} cancelled (session expired)`)
        break
      }

      // ── Async payment methods: explicitly paid after session ───────────────
      case 'checkout.session.async_payment_succeeded': {
        const session       = event.data.object as Stripe.Checkout.Session
        const reservationId = session.metadata?.reservation_id
        if (!reservationId) break

        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null

        const { error, data: confirmed } = await db
          .from('reservations')
          .update({ status: 'confirmed', payment_status: 'paid', stripe_payment_intent_id: paymentIntentId })
          .eq('id', reservationId)
          .eq('status', 'pending')
          .select('id')

        if (error) {
          console.error('[webhook] async_payment_succeeded db error:', error.message)
          return NextResponse.json({ error: 'db_error' }, { status: 500 })
        }

        if ((confirmed?.length ?? 0) > 0) {
          try {
            await sendConfirmationEmail(session)
          } catch (emailErr) {
            console.error('[webhook] email_delivery_failed (async payment, uncaught)', emailErr)
          }
        }
        break
      }

      case 'checkout.session.async_payment_failed': {
        const session       = event.data.object as Stripe.Checkout.Session
        const reservationId = session.metadata?.reservation_id
        if (!reservationId) break

        await db
          .from('reservations')
          .update({ payment_status: 'failed' })
          .eq('id', reservationId)
          .eq('status', 'pending')
        break
      }

      default:
        // Unhandled event type — return 200 so Stripe doesn't retry
        break
    }
  } catch (err) {
    console.error('[webhook] unhandled error in event processing:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
