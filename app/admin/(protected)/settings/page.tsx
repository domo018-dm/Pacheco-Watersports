import { createServiceClient } from '@/lib/supabase/server'
import StripeSetup from './StripeSetup'

export const metadata = { title: 'Settings — Admin' }

async function getSetting(key: string): Promise<string | null> {
  try {
    const { data } = await createServiceClient()
      .from('settings').select('value').eq('key', key).single()
    return data?.value ?? null
  } catch {
    return null
  }
}

export default async function SettingsPage() {
  const [accountName, publishableKey] = await Promise.all([
    getSetting('stripe_account_name'),
    getSetting('stripe_publishable_key'),
  ])

  const isLive = publishableKey ? publishableKey.startsWith('pk_live_') : null

  return (
    <div className="adm-settings-page">
      <h1 className="adm-settings-heading">Settings</h1>

      <section>
        <h2 className="adm-settings-section-title">Stripe Payments</h2>
        <StripeSetup accountName={accountName} isLive={isLive} />
      </section>
    </div>
  )
}
