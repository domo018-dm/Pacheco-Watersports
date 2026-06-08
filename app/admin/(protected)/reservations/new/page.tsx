import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import NewBookingForm from './NewBookingForm'

export const metadata = { title: 'New Booking — Pacheco Admin' }

export default async function NewBookingPage() {
  const supabase = await createAuthServerClient()
  const { data: crafts } = await supabase
    .from('crafts')
    .select('id, name')
    .eq('active', true)
    .order('sort_order')

  return (
    <div>
      <div className="adm-topbar">
        <div>
          <a href="/admin/reservations" className="adm-back-link">← Reservations</a>
          <h1 className="adm-title" style={{ marginTop: '.25rem' }}>New Booking</h1>
        </div>
      </div>
      <div className="adm-content">
        <NewBookingForm crafts={crafts ?? []} />
      </div>
    </div>
  )
}
