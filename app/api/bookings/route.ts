// TODO: Bookings API
// POST /api/bookings
//   - Validate request body (craftId, date, timeSlot, customerName, customerPhone)
//   - Check availability in Supabase
//   - Create Stripe PaymentIntent
//   - Insert pending booking into Supabase
//   - Return { clientSecret, bookingId }

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
