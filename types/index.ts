export type CraftType = 'ski' | 'boat'
export type Availability = 'open' | 'few' | 'full'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Craft {
  id: string
  type: CraftType
  name: string
  seats: number
  classLabel: string
  desc: string
  rate: string
  availability: Availability
  photoUrl?: string
}

export interface Booking {
  id: string
  craftId: string
  customerName: string
  customerPhone: string
  date: string          // ISO date string YYYY-MM-DD
  timeSlot: string      // e.g. "9:00 AM"
  status: BookingStatus
  stripePaymentIntentId?: string
  createdAt: string
}

export interface TimeSlot {
  label: string
  available: boolean
}
