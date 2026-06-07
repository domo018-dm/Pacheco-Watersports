import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

  if (typeof b.craftId       !== 'string' || !b.craftId)       return { error: 'missing craftId' }
  if (typeof b.customerName  !== 'string' || !b.customerName.trim()) return { error: 'missing customerName' }
  if (typeof b.customerEmail !== 'string' || !b.customerEmail.trim()) return { error: 'missing customerEmail' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.customerEmail as string)) return { error: 'invalid customerEmail' }
  if (typeof b.startTime     !== 'string' || isNaN(Date.parse(b.startTime as string))) return { error: 'invalid startTime' }
  if (typeof b.endTime       !== 'string' || isNaN(Date.parse(b.endTime   as string))) return { error: 'invalid endTime' }

  return {
    data: {
      craftId:       b.craftId       as string,
      customerName:  b.customerName  as string,
      customerEmail: b.customerEmail as string,
      customerPhone: typeof b.customerPhone === 'string' ? b.customerPhone : undefined,
      startTime:     b.startTime     as string,
      endTime:       b.endTime       as string,
    },
  }
}

export async function POST(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const validation = validateBody(raw)
  if ('error' in validation) {
    return NextResponse.json({ error: 'invalid_input', detail: validation.error }, { status: 400 })
  }

  const { craftId, customerName, customerEmail, customerPhone, startTime, endTime } = validation.data

  if (new Date(endTime) <= new Date(startTime)) {
    return NextResponse.json({ error: 'invalid_time_range' }, { status: 400 })
  }

  const supabase = createServerClient()

  // create_reservation is SECURITY DEFINER and acquires SELECT … FOR UPDATE on the
  // crafts row to serialize concurrent bookings for the same craft.
  const { data, error } = await supabase.rpc('create_reservation', {
    p_craft_id:       craftId,
    p_customer_name:  customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone ?? null,
    p_start_time:     startTime,
    p_end_time:       endTime,
  })

  if (error) {
    console.error('[POST /api/reservations]', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (data?.error) {
    const status =
      data.error === 'craft_not_found'    ? 404 :
      data.error === 'no_units_available' ? 409 :
      data.error === 'slot_blocked'       ? 409 : 400
    return NextResponse.json(data, { status })
  }

  return NextResponse.json(data, { status: 201 })
}
