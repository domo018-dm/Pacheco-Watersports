import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import TikToksManager from './TikToksManager'
import type { TikTok } from '@/types'

export const metadata = { title: 'TikToks — Pacheco Admin' }

export default async function TikToksPage() {
  const supabase = await createAuthServerClient()
  const { data: tiktoks } = await supabase
    .from('tiktoks')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return <TikToksManager tiktoks={(tiktoks ?? []) as TikTok[]} />
}
