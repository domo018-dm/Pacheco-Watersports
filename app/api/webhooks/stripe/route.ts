import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

// Stripe delivers webhooks multiple times on network errors. Every handler path
// must be idempotent — processing the same event twice must not corrupt state.
//
// Idempotency strategy:
//   - checkout.session.completed: UPDATE WHERE status='pending' — if already
//     'confirmed', 0 rows update, we return 200 (Stripe stops retrying).
//   - checkout.session.expired: UPDATE WHERE status='pending' — safe same way.
//
// NEVER return a non-2xx for a valid but already-processed event; Stripe would retry forever.

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

        // Idempotent: WHERE status='pending' means re-delivery is a no-op
        const { error } = await db
          .from('reservations')
          .update({
            status:                    'confirmed',
            payment_status:            'paid',
            stripe_payment_intent_id:  paymentIntentId,
          })
          .eq('id', reservationId)
          .eq('status', 'pending')   // ← idempotency guard

        if (error) {
          console.error('[webhook] failed to confirm reservation:', error.message)
          // Return 500 so Stripe retries — the reservation isn't confirmed yet
          return NextResponse.json({ error: 'db_error' }, { status: 500 })
        }

        console.log(`[webhook] reservation ${reservationId} confirmed (session ${session.id})`)
        break
      }

      // ── Checkout session expired without payment ───────────────────────────
      // Our availability logic already ignores expired-pending reservations.
      // Cancel explicitly for clean admin records.
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

        const { error } = await db
          .from('reservations')
          .update({ status: 'confirmed', payment_status: 'paid', stripe_payment_intent_id: paymentIntentId })
          .eq('id', reservationId)
          .eq('status', 'pending')

        if (error) {
          console.error('[webhook] async_payment_succeeded db error:', error.message)
          return NextResponse.json({ error: 'db_error' }, { status: 500 })
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
