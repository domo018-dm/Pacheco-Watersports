import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const craftId = searchParams.get('craftId')
  const start   = searchParams.get('start')
  const end     = searchParams.get('end')

  if (!craftId || !start || !end) {
    return NextResponse.json({ error: 'Missing params: craftId, start, end' }, { status: 400 })
  }

  const startDate = new Date(start)
  const endDate   = new Date(end)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid ISO date strings' }, { status: 400 })
  }
  if (endDate <= startDate) {
    return NextResponse.json({ error: 'end must be after start' }, { status: 400 })
  }

  const supabase = createServerClient()

  // SECURITY DEFINER function — runs as owner, bypasses RLS on reservations.
  // Returns: { total, booked, available, blocked } or { error }
  //
  // Availability logic (enforced inside the function):
  //   available = total_units
  //              − COUNT(reservations WHERE overlap AND (confirmed OR non-expired pending))
  //   if any availability_block overlaps → available = 0, blocked = true
  //
  // Overlap: start_time < p_end AND end_time > p_start  (standard half-open interval)
  const { data, error } = await supabase.rpc('check_availability', {
    p_craft_id:   craftId,
    p_start_time: startDate.toISOString(),
    p_end_time:   endDate.toISOString(),
  })

  if (error) {
    console.error('[GET /api/availability]', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (data?.error) {
    const status = data.error === 'craft_not_found' ? 404 : 400
    return NextResponse.json(data, { status })
  }

  return NextResponse.json(data)
}
