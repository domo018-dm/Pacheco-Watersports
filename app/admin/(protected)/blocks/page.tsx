import { createAuthServerClient } from '@/lib/supabase/ssr'
import BlocksManager from './BlocksManager'

export const metadata = { title: 'Blocks — Pacheco Admin' }

export default async function BlocksPage() {
  const supabase = await createAuthServerClient()
  const [{ data: blocks }, { data: crafts }] = await Promise.all([
    supabase
      .from('availability_blocks')
      .select('*, crafts(name)')
      .order('start_time', { ascending: true }),
    supabase.from('crafts').select('id, name').order('sort_order'),
  ])

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">Availability Blocks</h1>
      </div>
      <div className="adm-content">
        <BlocksManager blocks={blocks ?? []} crafts={crafts ?? []} />
      </div>
    </div>
  )
}
