'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { Craft } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { hours: 1, label: '1 hr'  },
  { hours: 2, label: '2 hr'  },
  { hours: 3, label: '3 hr'  },
  { hours: 4, label: '4 hr'  },
]
const ALL_START_HOURS = [8,9,10,11,12,13,14,15,16,17]

function hourLabel(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const d    = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${d}:00 ${ampm}`
}

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// midnight of the chosen date in the user's local timezone → UTC ISO string.
// The day endpoint adds hour offsets to this, matching exactly how the booking
// form constructs start/end times via new Date(`${date}T${h}:00:00`).toISOString().
function midnightISO(date: string) {
  return new Date(`${date}T00:00:00`).toISOString()
}

function toISO(date: string, hour: number) {
  return new Date(`${date}T${String(hour).padStart(2,'00')}:00:00`).toISOString()
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SlotAvail { hour: number; available: number; blocked: boolean }

// ── Main modal ────────────────────────────────────────────────────────────────
interface Props {
  craft:   Craft
  onClose: () => void
}

export default function ReserveModal({ craft, onClose }: Props) {
  const minDate = todayLocal()

  const [date,      setDate]      = useState('')
  const [duration,  setDuration]  = useState(2)
  const [startHour, setStartHour] = useState<number | null>(null)

  const [slots,        setSlots]        = useState<SlotAvail[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  const validHours = ALL_START_HOURS.filter(h => h + duration <= 18)

  // Fetch all slot availability whenever date or duration changes
  const fetchSlots = useCallback(async () => {
    if (!date) { setSlots([]); return }
    setLoadingSlots(true)
    setStartHour(null)
    try {
      const res = await fetch(
        `/api/availability/day?craftId=${encodeURIComponent(craft.id)}&baseTs=${encodeURIComponent(midnightISO(date))}&duration=${duration}`
      )
      const data = await res.json()
      if (Array.isArray(data.slots)) setSlots(data.slots as SlotAvail[])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [craft.id, date, duration])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // Close on Escape; lock body scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const selectedSlot = slots.find(s => s.hour === startHour)
  const canSubmit =
    !!date && startHour !== null &&
    !!name.trim() && !!email.trim() &&
    !!selectedSlot && selectedSlot.available > 0 && !selectedSlot.blocked &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || startHour === null) return
    setFormError(null)
    setSubmitting(true)

    try {
      // Single request: creates pending reservation + Stripe Checkout Session server-side.
      // Amount is computed from hourly_rate in the DB — never sent from the client.
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          craftId:       craft.id,
          customerName:  name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
          startTime:     toISO(date, startHour),
          endTime:       toISO(date, startHour + duration),
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        const messages: Record<string, string> = {
          no_units_available: 'That slot just filled up. Pick a different time.',
          slot_blocked:       "That window isn't available. Pick another.",
          craft_not_found:    'Craft not found. Close and try again.',
          craft_not_bookable: data.message ?? 'This craft isn\'t available online. Call us.',
          stripe_error:       data.message ?? 'Payment setup failed. Please try again.',
          server_error:       data.message ?? 'Something went wrong. Call us at (505) 573-9275.',
          db_error:           'Something went wrong. Call us at (505) 573-9275.',
          invalid_input:      data.detail === 'invalid customerEmail'
                                ? 'Please enter a valid email address.'
                                : 'Please check your name and email, then try again.',
          invalid_time_range: 'Invalid time selection. Please pick a slot and try again.',
          invalid_duration:   'Invalid duration. Please pick a time slot and try again.',
          amount_too_small:   'Booking amount too small. Please call us at (505) 573-9275.',
        }
        setFormError(messages[data.error] ?? data.message ?? 'Something went wrong. Call us at (505) 573-9275.')
        setSubmitting(false)
        fetchSlots()
        return
      }

      // Redirect to Stripe Checkout — page navigates away; no setSubmitting(false) needed
      window.location.href = data.url
    } catch {
      setFormError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  const typeLabel = craft.type === 'ski' ? 'Jet Ski' : craft.class_label === 'CRUISE' ? 'Pontoon' : 'Boat'
  const rateLabel = craft.hourly_rate ? `$${craft.hourly_rate.toFixed(0)}/hr` : craft.rate

  return (
    <div className="modal open" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-panel" onClick={e => e.stopPropagation()}>

        {/* Photo strip */}
        <div className="modal-photo">
          {craft.image_url && (
            <Image src={craft.image_url} alt={craft.name} fill sizes="560px" style={{ objectFit: 'cover' }} />
          )}
          <div className="ov" />
        </div>

        <button className="modal-x" type="button" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-body">
          {/* Stripe Checkout handles payment; /book/success shows the receipt */}
          <form onSubmit={handleSubmit} noValidate>
              {/* Header */}
              <p className="modal-eyebrow">{typeLabel}</p>
              <h3>{craft.name}</h3>
              <p className="modal-sub">
                {craft.seats} {craft.type === 'ski' ? 'riders' : 'passengers'} · {craft.description}
              </p>

              {/* Live price — updates as duration changes */}
              {craft.hourly_rate && (
                <div className="modal-price-bar">
                  <span className="modal-price-total">
                    ${(craft.hourly_rate * duration).toFixed(0)}
                  </span>
                  <span className="modal-price-detail">
                    ${craft.hourly_rate.toFixed(0)}/hr × {duration} hr
                  </span>
                </div>
              )}

              {/* Date */}
              <div className="field-label">Date</div>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={e => { setDate(e.target.value); setSlots([]); setStartHour(null) }}
                required
                style={{
                  width: '100%', fontFamily: 'var(--ff-body)', fontSize: '1rem',
                  padding: '.8rem .9rem', background: 'var(--ink-2)',
                  border: '1px solid var(--line)', color: 'var(--bone)',
                  colorScheme: 'dark', marginBottom: '1.2rem',
                }}
              />

              {/* Duration pills */}
              <div className="field-label">Duration</div>
              <div className="dur-pills">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d.hours}
                    type="button"
                    className={`dur-pill${duration === d.hours ? ' active' : ''}`}
                    onClick={() => setDuration(d.hours)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Time slots */}
              <div className="field-label" style={{ marginTop: '1.2rem' }}>
                <span>Start time</span>
                {loadingSlots && (
                  <span style={{ fontWeight: 400, opacity: .5, letterSpacing: 0 }}>Checking…</span>
                )}
              </div>

              {!date ? (
                <p className="modal-hint">Pick a date to see available times</p>
              ) : (
                <div className="slots">
                  {validHours.map(h => {
                    const s         = slots.find(x => x.hour === h)
                    const available = s?.available ?? (loadingSlots ? 99 : 0)
                    const blocked   = s?.blocked   ?? false
                    const isDisabled = !loadingSlots && (available === 0 || blocked)
                    const isFew      = !loadingSlots && !isDisabled && available === 1

                    return (
                      <button
                        key={h}
                        type="button"
                        className={`slot${isFew ? ' few' : ''}${loadingSlots ? ' loading' : ''}`}
                        aria-pressed={startHour === h}
                        disabled={isDisabled}
                        onClick={() => setStartHour(h)}
                      >
                        {hourLabel(h)}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Avail note for selected slot */}
              {selectedSlot && !loadingSlots && (
                <p style={{
                  fontFamily: 'var(--ff-mono)', fontSize: '.7rem', letterSpacing: '.08em',
                  marginBottom: '.3rem', marginTop: '-.5rem',
                  color: selectedSlot.available === 1 ? 'var(--amber)' : 'oklch(0.85 0.015 85 / .45)',
                }}>
                  {selectedSlot.available === 1
                    ? '⚠ Last unit'
                    : `${selectedSlot.available} of ${craft.total_units} open`}
                </p>
              )}

              {/* Customer info */}
              <div className="field-label" style={{ marginTop: '1.2rem' }}>Your info</div>
              <div className="modal-inputs">
                <input type="text"  placeholder="Full name"          value={name}  onChange={e => setName(e.target.value)}  autoComplete="name"  required />
                <input type="email" placeholder="Email"              value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
                <input type="tel"   placeholder="Phone (recommended)" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
              </div>

              {formError && (
                <p role="alert" style={{
                  fontFamily: 'var(--ff-mono)', fontSize: '.78rem',
                  color: 'var(--clay)', background: 'oklch(0.63 0.135 46 / .1)',
                  border: '1px solid oklch(0.63 0.135 46 / .25)',
                  padding: '.7rem .9rem', marginBottom: '1rem',
                }}>
                  {formError}
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-confirm" disabled={!canSubmit}>
                  {submitting
                    ? 'Redirecting to payment…'
                    : craft.hourly_rate && startHour !== null
                      ? `Pay $${(craft.hourly_rate * duration).toFixed(0)} — Secure Checkout`
                      : 'Continue to Payment'}
                </button>
                <p className="modal-call">
                  Powered by Stripe · your card details never touch our server ·{' '}
                  <a href="tel:+15055739275">(505) 573-9275</a>
                </p>
              </div>
            </form>
        </div>
      </div>
    </div>
  )
}
