'use server'

import { revalidatePath } from 'next/cache'
import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import { getStripe } from '@/lib/stripe'

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

// ── Refunds ───────────────────────────────────────────────────────────────────
export async function refundReservation(reservationId: string, amountCents: number) {
  const supabase = await requireAdmin()

  const { data: reservation, error: fetchErr } = await supabase
    .from('reservations')
    .select('stripe_payment_intent_id, amount_cents, refunded_cents, payment_status')
    .eq('id', reservationId)
    .single()

  if (fetchErr || !reservation) return { error: fetchErr?.message ?? 'Reservation not found' }
  if (!reservation.stripe_payment_intent_id) return { error: 'No payment intent on record — cannot refund' }

  const alreadyRefunded = reservation.refunded_cents ?? 0
  const total           = reservation.amount_cents   ?? 0
  const remaining       = total - alreadyRefunded

  if (amountCents <= 0 || amountCents > remaining) {
    return { error: `Amount must be between $0.01 and $${(remaining / 100).toFixed(2)}` }
  }

  // Issue refund via Stripe
  let refundId: string
  try {
    const refund = await getStripe().refunds.create({
      payment_intent: reservation.stripe_payment_intent_id,
      amount:         amountCents,
      reason:         'requested_by_customer',
    })
    refundId = refund.id
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    return { error: `Stripe refund failed: ${msg}` }
  }

  // Optimistic DB update — the charge.refunded webhook will also set this,
  // using the authoritative cumulative value from Stripe.
  const newRefunded  = alreadyRefunded + amountCents
  const isFullRefund = newRefunded >= total

  const { error: updateErr } = await supabase
    .from('reservations')
    .update({
      refunded_cents: newRefunded,
      payment_status: isFullRefund ? 'refunded' : 'partially_refunded',
      ...(isFullRefund ? { status: 'cancelled' } : {}),
    })
    .eq('id', reservationId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/admin/reservations')
  return { refundId }
}
