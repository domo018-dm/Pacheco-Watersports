'use server'

import { revalidatePath } from 'next/cache'
import { createAuthServerClient } from '@/lib/supabase/ssr-server'

// ── Auth guard ─────────────────────────────────────────────────────────────────
// Every action verifies admin status independently (defense in depth).
async function requireAdmin() {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Not authorized')
  return supabase
}

// ── Reservations ──────────────────────────────────────────────────────────────
export async function updateReservationStatus(id: string, status: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('reservations').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/reservations')
  return {}
}

// ── Crafts ────────────────────────────────────────────────────────────────────
export interface CraftInput {
  id: string; name: string; type: string; class_label: string
  description: string; seats: number; hourly_rate: number | null
  rate: string; total_units: number; sort_order: number
  active: boolean; image_url: string | null
}

export async function createCraft(data: CraftInput) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath('/')
  return {}
}

export async function updateCraft(id: string, data: Partial<CraftInput>) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath(`/admin/crafts/${id}`)
  revalidatePath('/')
  return {}
}

export async function deleteCraft(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath('/')
  return {}
}

export async function toggleCraftActive(id: string, active: boolean) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('crafts').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/crafts')
  revalidatePath('/')
  return {}
}

// ── Availability blocks ───────────────────────────────────────────────────────
export async function createBlock(data: {
  craft_id: string | null; reason: string | null
  start_time: string; end_time: string
}) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('availability_blocks').insert(data)
  if (error) return { error: error.message }
  revalidatePath('/admin/blocks')
  return {}
}

export async function deleteBlock(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('availability_blocks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blocks')
  return {}
}
