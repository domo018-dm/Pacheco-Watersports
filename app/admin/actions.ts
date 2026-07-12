'use server'

import { revalidatePath } from 'next/cache'
import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import Stripe from 'stripe'
import { getStripe, getWebhookSecret as _getWebhookSecret } from '@/lib/stripe'
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

// ── Land-clearing before/after jobs ─────────────────────────────────────────
export async function createLandJob(data: { title: string; before_url: string; after_url: string }) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('land_jobs').insert({
    title:      data.title.trim() || null,
    before_url: data.before_url,
    after_url:  data.after_url,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/land-jobs')
  revalidatePath('/')
  return {}
}

export async function deleteLandJob(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('land_jobs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/land-jobs')
  revalidatePath('/')
  return {}
}

export async function toggleLandJobActive(id: string, active: boolean) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('land_jobs').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/land-jobs')
  revalidatePath('/')
  return {}
}

// Reorder a job up/down; renormalizes sort_order to sequential values so it
// works even when jobs share the default 0. Mirrors moveCraft.
export async function moveLandJob(id: string, direction: 'up' | 'down') {
  const supabase = await requireAdmin()
  const { data: jobs, error } = await supabase
    .from('land_jobs')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return { error: error.message }
  if (!jobs) return { error: 'Could not load jobs' }

  const idx = jobs.findIndex(j => j.id === id)
  if (idx === -1) return { error: 'Job not found' }
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= jobs.length) return {}

  const reordered = [...jobs]
  const [moved] = reordered.splice(idx, 1)
  reordered.splice(target, 0, moved)

  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].sort_order === i) continue
    const { error: upErr } = await supabase.from('land_jobs').update({ sort_order: i }).eq('id', reordered[i].id)
    if (upErr) return { error: upErr.message }
  }
  revalidatePath('/admin/land-jobs')
  revalidatePath('/')
  return {}
}

// Public review submission — NOT admin-gated. Reviews come in hidden
// (active: false) and only appear after the owner approves them in the admin.
// Anon has no INSERT grant on reviews, so this writes via the service client.
export async function submitReview(data: {
  author: string; location?: string; body: string; rating: number; hp?: string
}) {
  // Honeypot: real users never fill this hidden field. Silently accept + drop.
  if (data.hp && data.hp.trim() !== '') return { ok: true as const }

  const author   = (data.author ?? '').trim()
  const location = (data.location ?? '').trim()
  const body     = (data.body ?? '').trim()
  const rating   = Math.round(Number(data.rating))

  if (author.length < 2 || author.length > 60)   return { error: 'Please enter your name.' }
  if (body.length   < 4 || body.length   > 1000) return { error: 'Please write a few words about your experience.' }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { error: 'Please choose a star rating (1–5).' }
  if (location.length > 80) return { error: 'Location is too long.' }

  const { createServiceClient } = await import('@/lib/supabase/server')
  const db = createServiceClient()
  const { error } = await db.from('reviews').insert({
    author,
    location: location || null,
    body,
    rating,
    active:     false,   // pending owner approval
    sort_order: 0,
  })
  if (error) {
    console.error('[submitReview] insert failed:', error.message)
    return { error: 'Could not submit your review. Please try again.' }
  }

  revalidatePath('/admin/reviews')
  return { ok: true as const }
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
  for_sale: boolean; sale_price: number | null
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

// Move a craft one position up/down in the public listing order. Renormalizes
// sort_order to sequential values (0,1,2,…) so it works even when items share
// the default sort_order of 0. Only rows whose position changed are written.
export async function moveCraft(id: string, direction: 'up' | 'down') {
  const supabase = await requireAdmin()
  const { data: crafts, error } = await supabase
    .from('crafts')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return { error: error.message }
  if (!crafts) return { error: 'Could not load inventory' }

  const idx = crafts.findIndex(c => c.id === id)
  if (idx === -1) return { error: 'Item not found' }

  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= crafts.length) return {}   // already at the edge — no-op

  const reordered = [...crafts]
  const [moved] = reordered.splice(idx, 1)
  reordered.splice(target, 0, moved)

  // Persist only the rows whose sort_order actually changed.
  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].sort_order === i) continue
    const { error: upErr } = await supabase.from('crafts').update({ sort_order: i }).eq('id', reordered[i].id)
    if (upErr) return { error: upErr.message }
  }

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
    session = await (await getStripe()).checkout.sessions.create({
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
      const session = await (await getStripe()).checkout.sessions.retrieve(reservation.stripe_session_id)
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
    const refund = await (await getStripe()).refunds.create({
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

// ── Stripe connect ────────────────────────────────────────────────────────────
export async function connectStripe(publishableKey: string, secretKey: string) {
  await requireAdmin()

  // Validate keys format before hitting Stripe
  if (!publishableKey.startsWith('pk_')) {
    return { error: 'Publishable key must start with pk_live_ or pk_test_' }
  }
  if (!secretKey.startsWith('sk_')) {
    return { error: 'Secret key must start with sk_live_ or sk_test_' }
  }
  if (publishableKey.startsWith('pk_live_') !== secretKey.startsWith('sk_live_')) {
    return { error: 'Publishable and secret keys must be from the same mode (both live or both test)' }
  }

  // Validate keys by calling Stripe — list a single product to confirm the key works
  let stripe: Stripe
  let accountName: string
  try {
    stripe = new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' })
    // Use balance.retrieve() — works on any Stripe account with no required args
    const balance = await stripe.balance.retrieve()
    // Derive a label from key prefix since balance doesn't carry account name
    const mode = secretKey.startsWith('sk_live_') ? 'Live' : 'Test'
    accountName = `Stripe (${mode} mode)`
    void balance // used only for validation
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Stripe rejected the key: ${msg}` }
  }

  // Determine the webhook endpoint URL for this deployment
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pachecowatersports.com'
  const webhookUrl = `${siteUrl}/api/webhooks/stripe`
  const webhookEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    'checkout.session.completed',
    'checkout.session.expired',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'charge.refunded',
  ]

  // Delete any existing webhook for this URL to avoid duplicates
  try {
    const existing = await stripe.webhookEndpoints.list({ limit: 100 })
    for (const wh of existing.data) {
      if (wh.url === webhookUrl) {
        await stripe.webhookEndpoints.del(wh.id)
      }
    }
  } catch {
    // Non-fatal — proceed to create
  }

  // Create the webhook and capture the signing secret
  let webhookSecret: string
  try {
    const webhook = await stripe.webhookEndpoints.create({
      url:            webhookUrl,
      enabled_events: webhookEvents,
      description:    'Pacheco Watersports booking webhooks (auto-configured)',
    })
    webhookSecret = webhook.secret ?? ''
    if (!webhookSecret) {
      return { error: 'Stripe webhook created but did not return a signing secret — please try again' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Failed to create webhook: ${msg}` }
  }

  // Save all keys + account name to the settings table
  const { createServiceClient } = await import('@/lib/supabase/server')
  const db = createServiceClient()
  const upserts = [
    { key: 'stripe_publishable_key', value: publishableKey },
    { key: 'stripe_secret_key',      value: secretKey },
    { key: 'stripe_webhook_secret',  value: webhookSecret },
    { key: 'stripe_account_name',    value: accountName },
  ]
  for (const row of upserts) {
    const { error } = await db
      .from('settings')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) return { error: `Failed to save settings: ${error.message}` }
  }

  revalidatePath('/admin/settings')
  return { accountName }
}
