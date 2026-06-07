// TODO: Stripe webhook handler
// POST /api/webhooks/stripe
//   - Verify Stripe-Signature header with STRIPE_WEBHOOK_SECRET
//   - Handle payment_intent.succeeded → mark booking as confirmed in Supabase
//   - Handle payment_intent.payment_failed → mark booking as cancelled
//   - Send confirmation SMS/email (Twilio / Resend) if desired

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
