import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const START_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const craftId  = searchParams.get('craftId')
  const baseTs   = searchParams.get('baseTs')   // midnight local time as UTC ISO
  const duration = parseInt(searchParams.get('duration') ?? '1', 10)

  if (!craftId || !baseTs || isNaN(duration) || duration < 1 || duration > 4) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 })
  }

  const baseTsMs = new Date(baseTs).getTime()
  if (isNaN(baseTsMs)) {
    return NextResponse.json({ error: 'Invalid baseTs' }, { status: 400 })
  }

  const validHours = START_HOURS.filter(h => h + duration <= 18)
  const supabase   = createServerClient()

  // One server call per slot — run in parallel on the server (fast, same region as DB)
  const slots = await Promise.all(
    validHours.map(async (h) => {
      const startISO = new Date(baseTsMs + h * 3_600_000).toISOString()
      const endISO   = new Date(baseTsMs + (h + duration) * 3_600_000).toISOString()

      const { data } = await supabase.rpc('check_availability', {
        p_craft_id:   craftId,
        p_start_time: startISO,
        p_end_time:   endISO,
      })

      return {
        hour:      h,
        available: (data as { available?: number } | null)?.available ?? 0,
        blocked:   (data as { blocked?: boolean }  | null)?.blocked   ?? false,
      }
    })
  )

  return NextResponse.json({ slots })
}
