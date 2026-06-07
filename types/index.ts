export type CraftType = 'ski' | 'boat'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type BookingStatus = ReservationStatus  // legacy alias

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

export interface Reservation {
  id:             string
  craft_id:       string
  customer_name:  string
  customer_email: string
  customer_phone: string | null
  start_time:     string    // ISO 8601
  end_time:       string
  status:         ReservationStatus
  notes:          string | null
  expires_at:     string
  created_at:     string
}

export interface AvailabilityBlock {
  id:         string
  craft_id:   string | null  // null = sitewide block
  start_time: string
  end_time:   string
  reason:     string | null
  created_at: string
}

// Legacy — kept for backwards compat with old bookings table reference
export interface Booking {
  id: string
  craft_id: string
  customer_name: string
  customer_phone: string
  date: string
  time_slot: string
  status: BookingStatus
  stripe_payment_intent_id?: string
  created_at: string
}
