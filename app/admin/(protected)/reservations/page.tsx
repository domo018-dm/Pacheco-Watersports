import { createAuthServerClient } from '@/lib/supabase/ssr'
import ReservationsClient from './ReservationsClient'

export const metadata = { title: 'Reservations — Pacheco Admin' }

interface Props {
  searchParams: Promise<{ status?: string; craftId?: string; from?: string; to?: string }>
}

export default async function ReservationsPage({ searchParams }: Props) {
  const p = await searchParams
  const supabase = await createAuthServerClient()

  // Build reservation query
  let q = supabase
    .from('reservations')
    .select('*, crafts(name, type)')
    .order('start_time', { ascending: true })
    .limit(300)

  if (p.status)  q = q.eq('status', p.status)
  if (p.craftId) q = q.eq('craft_id', p.craftId)
  if (p.from)    q = q.gte('start_time', `${p.from}T00:00:00Z`)
  if (p.to)      q = q.lte('start_time', `${p.to}T23:59:59Z`)

  // Default: upcoming confirmed+pending from today
  if (!p.status && !p.from && !p.to && !p.craftId) {
    const today = new Date().toISOString().split('T')[0]
    q = q
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', `${today}T00:00:00Z`)
  }

  const [{ data: reservations }, { data: crafts }] = await Promise.all([
    q,
    supabase.from('crafts').select('id, name').order('sort_order'),
  ])

  return (
    <ReservationsClient
      reservations={reservations ?? []}
      crafts={crafts ?? []}
      filters={p}
    />
  )
}
