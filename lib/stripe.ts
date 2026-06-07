import Stripe from 'stripe'

// Lazy singleton — not instantiated at build time, only on first call.
// This lets the build succeed even before keys are added to the environment.
// To swap test → live keys: change STRIPE_SECRET_KEY in env only. No code edits needed.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY env var is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}
