export type CraftType = 'ski' | 'boat'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

/** Matches the `crafts` table schema exactly (snake_case DB columns). */
export interface Craft {
  id: string
  type: CraftType
  name: string
  seats: number
  class_label: string
  description: string
  rate: string           // display text e.g. "Hourly" or "Hourly · Half-day"
  hourly_rate: number | null
  image_url: string | null
  total_units: number
  sort_order: number
  active: boolean
  created_at: string
}

export interface Booking {
  id: string
  craft_id: string
  customer_name: string
  customer_phone: string
  date: string           // ISO date YYYY-MM-DD
  time_slot: string      // e.g. "9:00 AM"
  status: BookingStatus
  stripe_payment_intent_id?: string
  created_at: string
}

export interface TimeSlot {
  label: string
  available: boolean
}
