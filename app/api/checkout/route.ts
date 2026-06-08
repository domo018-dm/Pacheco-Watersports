import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import type { Craft } from '@/types'

interface Body {
  craftId:       string
  customerName:  string
  customerEmail: string
  customerPhone?: string
  startTime:     string
  endTime:       string
}

function validateBody(raw: unknown): { data: Body } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'invalid_body' }
  const b = raw as Record<string, unknown>
  if (typeof b.craftId       !== 'string' || !b.craftId)                    return { error: 'missing craftId' }
  if (typeof b.customerName  !== 'string' || !b.customerName.trim())         return { error: 'missing customerName' }
  if (typeof b.customerEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.customerEmail)) return { error: 'invalid customerEmail' }
  if (typeof b.startTime     !== 'string' || isNaN(Date.parse(b.startTime))) return { error: 'invalid startTime' }
  if (typeof b.endTime       !== 'string' || isNaN(Date.parse(b.endTime)))   return { error: 'invalid endTime' }
  return {
    data: {
      craftId:       b.craftId as string,
      customerName:  b.customerName as string,
      customerEmail: b.customerEmail as string,
      customerPhone: typeof b.customerPhone === 'string' ? b.customerPhone : undefined,
      startTime:     b.startTime as string,
      endTime:       b.endTime as string,
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleCheckout(req)
  } catch (err) {
    console.error('[POST /api/checkout] unhandled error:', err)
    return NextResponse.json(
      { error: 'server_error', message: 'Something went wrong on our end. Please try again or call us at (505) 573-9275.' },
      { status: 500 }
    )
  }
}

async function handleCheckout(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const validation = validateBody(raw)
  if ('error' in validation) {
    return NextResponse.json({ error: 'invalid_input', detail: validation.error }, { status: 400 })
  }

  const { craftId, customerName, customerEmail, customerPhone, startTime, endTime } = validation.data

  const startDate = new Date(startTime)
  const endDate   = new Date(endTime)

  if (endDate <= startDate) {
    return NextResponse.json({ error: 'invalid_time_range' }, { status: 400 })
  }

  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  if (durationHours <= 0 || durationHours > 8) {
    return NextResponse.json({ error: 'invalid_duration' }, { status: 400 })
  }

  const anonClient = createServerClient()

  // ── 1. Fetch craft (to compute amount server-side — NEVER trust client amount) ──
  const { data: craftData, error: craftErr } = await anonClient
    .from('crafts')
    .select('id, name, type, seats, description, class_label, hourly_rate')
    .eq('id', craftId)
    .eq('active', true)
    .single()

  if (craftErr || !craftData) {
    return NextResponse.json({ error: 'craft_not_found' }, { status: 404 })
  }

  const craft = craftData as Pick<Craft, 'id' | 'name' | 'type' | 'seats' | 'description' | 'class_label' | 'hourly_rate'>

  if (!craft.hourly_rate) {
    return NextResponse.json({ error: 'craft_not_bookable', message: 'No rate set for this craft. Please call us.' }, { status: 422 })
  }

  // Server-side amount calculation — client never provides a price
  const amountCents = Math.round(craft.hourly_rate * durationHours * 100)
  if (amountCents < 50) { // Stripe minimum
    return NextResponse.json({ error: 'amount_too_small' }, { status: 422 })
  }

  // ── 2. Create pending reservation (acquires DB-level FOR UPDATE lock) ─────────
  const { data: reservationData, error: rpcErr } = await anonClient.rpc('create_reservation', {
    p_craft_id:       craftId,
    p_customer_name:  customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone ?? null,
    p_start_time:     startTime,
    p_end_time:       endTime,
  })

  if (rpcErr) {
    console.error('[POST /api/checkout] create_reservation RPC error:', rpcErr.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (reservationData?.error) {
    const status =
      reservationData.error === 'craft_not_found'    ? 404 :
      reservationData.error === 'no_units_available' ? 409 :
      reservationData.error === 'slot_blocked'       ? 409 : 400
    return NextResponse.json(reservationData, { status })
  }

  const reservationId = reservationData.id as string

  // ── 3. Build success/cancel URLs ─────────────────────────────────────────────
  // Derive origin from request so no extra env var is needed for local or prod.
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ?? (() => {
      const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
      return `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`
    })()

  // ── 4. Create Stripe Checkout Session ────────────────────────────────────────
  const stripe  = getStripe()
  const typeStr = craft.type === 'ski' ? 'Jet Ski' : craft.class_label === 'CRUISE' ? 'Pontoon' : 'Boat'
  const timeStr = `${new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${durationHours}hr`

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       customerEmail,
      line_items: [{
        price_data: {
          currency:     'usd',
          unit_amount:  amountCents,
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
        start_time:     startTime,
        end_time:       endTime,
        duration_hours: String(durationHours),
        customer_name:  customerName,
      },
      success_url: `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/#fleet`,
    })
  } catch (err) {
    console.error('[POST /api/checkout] Stripe session create error:', err)
    // Reservation was created but Stripe failed — it will expire in 30min naturally
    return NextResponse.json({ error: 'stripe_error', message: 'Payment setup failed. Your hold will release automatically. Please try again or call us.' }, { status: 502 })
  }

  // ── 5. Attach Stripe session ID to reservation (non-fatal) ──────────────────
  // The webhook uses metadata.reservation_id so this is convenience-only.
  // If the service client throws (missing env var) or the UPDATE fails, we still
  // redirect the user to Stripe — do NOT let this block the payment.
  try {
    const serviceClient = createServiceClient()
    const { error: updateErr } = await serviceClient
      .from('reservations')
      .update({ stripe_session_id: session.id })
      .eq('id', reservationId)
    if (updateErr) {
      console.error('[POST /api/checkout] Failed to attach session ID:', updateErr.message)
    }
  } catch (attachErr) {
    console.error('[POST /api/checkout] attach session ID threw:', attachErr)
  }

  return NextResponse.json({ url: session.url })
}
