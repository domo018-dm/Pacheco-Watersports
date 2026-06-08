import { notFound } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import CraftForm from '../CraftForm'

export const metadata = { title: 'Edit Craft — Pacheco Admin' }

export default async function EditCraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAuthServerClient()
  const { data: craft } = await supabase.from('crafts').select('*').eq('id', id).single()
  if (!craft) notFound()
  return <CraftForm craft={craft} />
}
