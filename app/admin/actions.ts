'use server'

import { revalidatePath } from 'next/cache'
import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import { getStripe } from '@/lib/stripe'
import { getResend } from '@/lib/resend'

// ── Auth guard ─────────────────────────────────────────────────────────────────
// Every action verifies admin status independently (defense in depth).
async function requireAdmin() {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Not authorized')
  return supabase
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export interface ReviewInput {
  author: string; location: string; body: string
  rating: number; active: boolean; sort_order: number
}

export async function createReview(data: ReviewInput) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('reviews').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin/reviews')
  revalidatePath('/')
  return {}
}

export async function updateReview(id: string, data: Partial<ReviewInput>) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('reviews').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/reviews')
  revalidatePath('/')
  return {}
}

export async function deleteReview(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/reviews')
  revalidatePath('/')
  return {}
}

// ── Reservations ──────────────────────────────────────────────────────────────
export async function updateReservationStatus(id: string, status: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('reservations').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/reservations')
  return {}
}

// ── Crafts ────────────────────────────────────────────────────────────────────
export interface CraftInput {
  id: string; name: string; type: string; class_label: string
  description: string; seats: number; hourly_rate: number | null
  rate: string; total_units: number; sort_order: number
  active: boolean; image_url: string | null
}

export async function createCraft(data: CraftInput) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath('/')
  return {}
}

export async function updateCraft(id: string, data: Partial<CraftInput>) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath(`/admin/crafts/${id}`)
  revalidatePath('/')
  return {}
}

export async function deleteCraft(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath('/')
  return {}
}

export async function toggleCraftActive(id: string, active: boolean) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath('/')
  return {}
}

// ── Availability blocks ───────────────────────────────────────────────────────
export async function createBlock(data: {
  craft_id: string | null; reason: string | null
  start_time: string; end_time: string
}) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('availability_blocks').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin/blocks')
  return {}
}

export async function deleteBlock(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('availability_blocks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blocks')
  return {}
}

// ── Reservation edit ──────────────────────────────────────────────────────────
export async function editReservation(
  reservationId: string,
  craftId: string,
  startTime: string,
  endTime: string,
) {
  const supabase = await requireAdmin()

  const { data, error } = await supabase.rpc('update_reservation', {
    p_reservation_id: reservationId,
    p_craft_id:       craftId,
    p_start_time:     startTime,
    p_end_time:       endTime,
  })

  if (error) return { error: error.message }
  if (data?.error) return { error: data.message ?? data.error }

  revalidatePath('/admin/reservations')
  return {}
}

// ── Payment link for admin-created reservations ───────────────────────────────
export async function generatePaymentLink(reservationId: string) {
  const supabase = await requireAdmin()

  const { data: res, error: fetchErr } = await supabase
    .from('reservations')
    .select('id, craft_id, start_time, end_time, customer_name, customer_email, payment_status, crafts(id, name, type, class_label, seats, hourly_rate)')
    .eq('id', reservationId)
    .single()

  if (fetchErr || !res) return { error: 'Reservation not found' }
  if (res.payment_status === 'paid') return { error: 'Reservation is already paid' }

  const craft = res.crafts as unknown as {
    id: string; name: string; type: string
    class_label: string; seats: number; hourly_rate: number | null
  } | null

  if (!craft?.hourly_rate) return { error: 'No rate set for this craft — set one in Crafts first' }

  const durationHours = (new Date(res.end_time).getTime() - new Date(res.start_time).getTime()) / 3_600_000
  const amountCents   = Math.round(craft.hourly_rate * durationHours * 100)
  if (amountCents < 50) return { error: 'Amount is below the Stripe minimum for card payment' }

  const origin  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pachecowatersports.com'
  const typeStr = craft.type === 'ski' ? 'Jet Ski' : craft.class_label === 'CRUISE' ? 'Pontoon' : 'Boat'
  const timeStr = `${new Date(res.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${durationHours}hr`
  const customerEmail = res.customer_email && res.customer_email !== 'noemail'
    ? res.customer_email : undefined

  let session
  try {
    session = await getStripe().checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [{
        price_data: {
          currency:    'usd',
          unit_amount: amountCents,
          product_data: {
            name:        `${craft.name} ${typeStr} Rental`,
            description: `${timeStr} · ${craft.seats} ${craft.type === 'ski' ? 'riders' : 'passengers'}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        reservation_id: reservationId,
        craft_name:     craft.name,
        craft_type:     craft.type ?? '',
        craft_class:    craft.class_label ?? '',
        start_time:     res.start_time,
        end_time:       res.end_time,
        duration_hours: String(durationHours),
        customer_name:  res.customer_name,
      },
      success_url: `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Stripe error'
    return { error: `Stripe error: ${msg}` }
  }

  // Store the session ID so the webhook can locate this reservation on payment
  await supabase.from('reservations').update({ stripe_session_id: session.id }).eq('id', reservationId)

  return { url: session.url! }
}

// ── Send payment link email ───────────────────────────────────────────────────
export async function sendPaymentLinkEmail(reservationId: string, paymentUrl: string) {
  const supabase = await requireAdmin()

  const { data: res, error } = await supabase
    .from('reservations')
    .select('customer_name, customer_email, start_time, end_time, crafts(name)')
    .eq('id', reservationId)
    .single()

  if (error || !res) return { error: 'Reservation not found' }

  const email = res.customer_email as string | null
  if (!email || email === 'noemail') return { error: 'No email address on file for this customer' }

  const craft = res.crafts as unknown as { name: string } | null
  const start = new Date(res.start_time)
  const durationHours = Math.round(
    (new Date(res.end_time).getTime() - start.getTime()) / 3_600_000
  )
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem 1rem;color:#1a1a1a;background:#fff">
  <p style="font-size:1rem;font-weight:700;margin:0 0 1.5rem;letter-spacing:.04em">PACHECO WATERSPORTS</p>
  <p style="margin:0 0 .75rem">Hi ${res.customer_name},</p>
  <p style="margin:0 0 1.25rem">Here&rsquo;s your secure payment link for your upcoming rental. Click the button below to pay by card &mdash; it only takes a minute.</p>
  <table style="margin:0 0 1.25rem">
    <tr><td style="color:#555;padding-right:.75rem">Craft</td><td><strong>${craft?.name ?? 'Your rental'}</strong></td></tr>
    <tr><td style="color:#555;padding-right:.75rem">Date</td><td>${dateStr}</td></tr>
    <tr><td style="color:#555;padding-right:.75rem">Time</td><td>${timeStr} &middot; ${durationHours}hr</td></tr>
  </table>
  <a href="${paymentUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:.75rem 1.75rem;border-radius:.375rem;text-decoration:none;font-weight:700;font-size:1rem;margin:0 0 1.5rem">Pay now &rarr;</a>
  <p style="color:#777;font-size:.85rem;margin:0 0 .5rem">This link expires in 24&nbsp;hours. Questions? Call us at <a href="tel:+15055739275" style="color:#0ea5e9">(505)&nbsp;573&#8209;9275</a> or message us on TikTok <a href="https://www.tiktok.com/@pachecowatersports" style="color:#0ea5e9">@pachecowatersports</a>.</p>
  <p style="color:#777;font-size:.85rem;margin:0">See you on the water!<br>&mdash; Pacheco Watersports, Conchas Lake, NM</p>
</body>
</html>`

  try {
    await getResend().emails.send({
      from:    'Pacheco Watersports <bookings@pachecowatersports.com>',
      to:      email,
      subject: `Your payment link — ${craft?.name ?? 'Pacheco Watersports'} rental`,
      html,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send email' }
  }

  return {}
}

// ── Admin phone-in bookings ───────────────────────────────────────────────────
export async function createAdminReservation(data: {
  craftId: string
  startTime: string
  endTime: string
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
}) {
  const supabase = await requireAdmin()

  // Use the same concurrency-safe RPC as public bookings for the availability
  // check and insert. Email is required by the RPC; use a placeholder if blank.
  const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_reservation', {
    p_craft_id:       data.craftId,
    p_customer_name:  data.customerName.trim(),
    p_customer_email: data.customerEmail.trim() || 'noemail',
    p_customer_phone: data.customerPhone.trim() || null,
    p_start_time:     data.startTime,
    p_end_time:       data.endTime,
  })

  if (rpcErr) return { error: rpcErr.message }
  if (rpcResult?.error) {
    return { error: (rpcResult.message as string | undefined) ?? (rpcResult.error as string) }
  }

  const reservationId = rpcResult.id as string

  // Promote to confirmed immediately — payment will be collected in person
  const { error: updateErr } = await supabase
    .from('reservations')
    .update({
      status: 'confirmed',
      ...(data.notes.trim() ? { notes: data.notes.trim() } : {}),
    })
    .eq('id', reservationId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/admin/reservations')
  return { id: reservationId }
}

// ── Refunds ───────────────────────────────────────────────────────────────────
export async function refundReservation(reservationId: string, amountCents: number) {
  const supabase = await requireAdmin()

  const { data: reservation, error: fetchErr } = await supabase
    .from('reservations')
    .select('stripe_payment_intent_id, stripe_session_id, amount_cents, refunded_cents, payment_status')
    .eq('id', reservationId)
    .single()

  if (fetchErr || !reservation) return { error: fetchErr?.message ?? 'Reservation not found' }

  // Resolve the payment intent ID. If it wasn't stored on the reservation (e.g.
  // the row predates the column), retrieve it from the Stripe session and cache it.
  let piId = reservation.stripe_payment_intent_id as string | null
  if (!piId && reservation.stripe_session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(reservation.stripe_session_id)
      piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as { id: string } | null)?.id ?? null
      if (piId) {
        await supabase.from('reservations').update({ stripe_payment_intent_id: piId }).eq('id', reservationId)
      }
    } catch {
      // fall through to the null check below
    }
  }

  if (!piId) return { error: 'No Stripe payment record found for this reservation' }

  const alreadyRefunded = reservation.refunded_cents ?? 0
  const total           = reservation.amount_cents   ?? 0
  const remaining       = total - alreadyRefunded

  if (amountCents <= 0 || amountCents > remaining) {
    return { error: `Amount must be between $0.01 and $${(remaining / 100).toFixed(2)}` }
  }

  // Issue refund via Stripe
  let refundId: string
  try {
    const refund = await getStripe().refunds.create({
      payment_intent: piId,
      amount:         amountCents,
      reason:         'requested_by_customer',
    })
    refundId = refund.id
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    return { error: `Stripe refund failed: ${msg}` }
  }

  // Optimistic DB update — the charge.refunded webhook will also set this,
  // using the authoritative cumulative value from Stripe.
  const newRefunded  = alreadyRefunded + amountCents
  const isFullRefund = newRefunded >= total

  const { error: updateErr } = await supabase
    .from('reservations')
    .update({
      refunded_cents: newRefunded,
      payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
      ...(isFullRefund ? { status: 'cancelled' } : {}),
    })
    .eq('id', reservationId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/admin/reservations')
  return { refundId }
}
