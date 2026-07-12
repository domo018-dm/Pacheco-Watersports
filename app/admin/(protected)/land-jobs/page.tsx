import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import LandJobsManager from './LandJobsManager'
import type { LandJob } from '@/types'

export const metadata = { title: 'Land Jobs — Pacheco Admin' }

export default async function LandJobsPage() {
  const supabase = await createAuthServerClient()
  const { data: jobs } = await supabase
    .from('land_jobs')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return <LandJobsManager jobs={(jobs ?? []) as LandJob[]} />
}
