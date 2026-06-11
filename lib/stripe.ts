import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

// DB config takes priority over env vars — keys set via the admin Settings page
// override the env vars without needing a redeployment.
// Falls back to env vars for local development and initial deployments.

let _stripe:   Stripe | null = null
let _activeKey = ''

async function readSetting(key: string): Promise<string | null> {
  try {
    const { data } = await createServiceClient()
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    return data?.value ?? null
  } catch {
    return null
  }
}

async function getSecretKey(): Promise<string> {
  const dbKey = await readSetting('stripe_secret_key')
  if (dbKey) return dbKey
  const envKey = process.env.STRIPE_SECRET_KEY
  if (!envKey) throw new Error('Stripe not configured. Go to Admin → Settings to connect Stripe.')
  return envKey
}

export async function getStripe(): Promise<Stripe> {
  const key = await getSecretKey()
  if (!_stripe || key !== _activeKey) {
    _stripe    = new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
    _activeKey = key
  }
  return _stripe
}

export async function getWebhookSecret(): Promise<string> {
  const dbSecret = await readSetting('stripe_webhook_secret')
  if (dbSecret) return dbSecret
  const envSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!envSecret) throw new Error('Stripe webhook secret not configured')
  return envSecret
}
