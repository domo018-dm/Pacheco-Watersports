import Link from 'next/link'
import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import CraftsClient from './CraftsClient'

export const metadata = { title: 'Crafts — Pacheco Admin' }

export default async function CraftsPage() {
  const supabase = await createAuthServerClient()
  const { data: crafts } = await supabase
    .from('crafts')
    .select('*')
    .order('sort_order')

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">Crafts</h1>
        <Link href="/admin/crafts/new" className="adm-btn adm-btn-sm">+ Add craft</Link>
      </div>
      <div className="adm-content">
        <CraftsClient crafts={crafts ?? []} />
      </div>
    </div>
  )
}
