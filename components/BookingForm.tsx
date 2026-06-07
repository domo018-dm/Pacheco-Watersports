'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Craft } from '@/types'

// ── Business hours ────────────────────────────────────────────────────────────
// Conchas Lake: 8 AM start through 5 PM last start (latest end = 6 PM).
const START_HOURS = [8,9,10,11,12,13,14,15,16,17]
const DURATION_OPTIONS = [
  { hours: 1, label: '1 hour'  },
  { hours: 2, label: '2 hours' },
  { hours: 3, label: '3 hours' },
  { hours: 4, label: '4 hours' },
]

function hourLabel(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const d    = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${d}:00 ${ampm}`
}

// Returns today's date as YYYY-MM-DD in the user's local timezone
function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toISO(date: string, hour: number) {
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).toISOString()
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AvailResult {
  total:     number
  booked:    number
  available: number
  blocked:   boolean
}

interface Confirmation {
  id:         string
  craftName:  string
  date:       string
  startHour:  number
  duration:   number
  name:       string
}

// ── Sub-components ────────────────────────────────────────────────────────────
function AvailBadge({ avail, checking }: { avail: AvailResult | null; checking: boolean }) {
  if (checking) {
    return <span className="avail-badge avail-checking">Checking…</span>
  }
  if (!avail) return null

  if (avail.blocked) {
    return <span className="avail-badge avail-full">Unavailable — closed that window</span>
  }
  if (avail.available === 0) {
    return <span className="avail-badge avail-full">Fully booked</span>
  }
  if (avail.available === 1) {
    return <span className="avail-badge avail-few">1 unit left</span>
  }
  return <span className="avail-badge avail-open">Available</span>
}

function ConfirmScreen({ c, onReset }: { c: Confirmation; onReset: () => void }) {
  const dateStr = new Date(`${c.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const startStr = hourLabel(c.startHour)
  const endStr   = hourLabel(c.startHour + c.duration)
  const refCode  = c.id.split('-')[0].toUpperCase()

  return (
    <div className="booking-confirm">
      <div className="booking-confirm-icon">✓</div>
      <h2 className="booking-confirm-head">You&apos;re all set, {c.name.split(' ')[0]}!</h2>
      <p className="booking-confirm-sub">
        We&apos;ll call to confirm your reservation — usually within the hour.
      </p>

      <div className="booking-confirm-card">
        <div className="booking-confirm-row">
          <span className="booking-confirm-label">Ref #</span>
          <span className="booking-confirm-value booking-ref">{refCode}</span>
        </div>
        <div className="booking-confirm-row">
          <span className="booking-confirm-label">Craft</span>
          <span className="booking-confirm-value">{c.craftName}</span>
        </div>
        <div className="booking-confirm-row">
          <span className="booking-confirm-label">Date</span>
          <span className="booking-confirm-value">{dateStr}</span>
        </div>
        <div className="booking-confirm-row">
          <span className="booking-confirm-label">Time</span>
          <span className="booking-confirm-value">{startStr} – {endStr}</span>
        </div>
      </div>

      <p className="booking-confirm-sub" style={{ marginTop: '1.5rem' }}>
        Questions? Call us at{' '}
        <a href="tel:+15055739275" style={{ color: 'var(--amber)' }}>(505) 573-9275</a>
      </p>

      <button type="button" className="btn-reserve" onClick={onReset}
        style={{ marginTop: '2rem', width: '100%', maxWidth: 320 }}>
        Book Another
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookingForm({ craft }: { craft: Craft }) {
  const minDate = todayLocal()

  const [date,      setDate]      = useState('')
  const [startHour, setStartHour] = useState<number | null>(null)
  const [duration,  setDuration]  = useState(1)

  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [avail,    setAvail]    = useState<AvailResult | null>(null)
  const [checking, setChecking] = useState(false)

  const [submitting,    setSubmitting]    = useState(false)
  const [confirmation,  setConfirmation]  = useState<Confirmation | null>(null)
  const [formError,     setFormError]     = useState<string | null>(null)

  // Clamp duration so end never exceeds 6 PM
  const validDurations = useCallback(() => {
    if (startHour === null) return DURATION_OPTIONS
    return DURATION_OPTIONS.filter(d => (startHour as number) + d.hours <= 18)
  }, [startHour])

  useEffect(() => {
    if (startHour === null) return
    const valid = validDurations()
    if (!valid.find(d => d.hours === duration)) {
      setDuration(valid[0]?.hours ?? 1)
    }
  }, [startHour, duration, validDurations])

  // Re-check availability when time window changes
  const checkAvail = useCallback(async () => {
    if (!date || startHour === null) { setAvail(null); return }
    setChecking(true)
    setAvail(null)
    try {
      const startISO = toISO(date, startHour as number)
      const endISO   = toISO(date, (startHour as number) + duration)
      const res = await fetch(
        `/api/availability?craftId=${encodeURIComponent(craft.id)}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
      )
      const data = await res.json()
      if (!data.error) setAvail(data as AvailResult)
    } catch {
      // network error — leave avail as null, form still submittable
    } finally {
      setChecking(false)
    }
  }, [craft.id, date, startHour, duration])

  useEffect(() => { checkAvail() }, [checkAvail])

  const canSubmit =
    !!date && startHour !== null &&
    !!name.trim() && !!email.trim() &&
    (!avail || (avail.available > 0 && !avail.blocked)) &&
    !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || startHour === null) return  // null guard satisfies TS for the cast below
    setFormError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/reservations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          craftId:       craft.id,
          customerName:  name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
          startTime:     toISO(date, startHour as number),
          endTime:       toISO(date, (startHour as number) + duration),
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        const messages: Record<string, string> = {
          no_units_available: 'Sorry, that slot just filled up. Please pick a different time.',
          slot_blocked:       'That window isn\'t available. Please pick another time.',
          invalid_time_range: 'Please check your selected times.',
          craft_not_found:    'Craft not found. Please go back and try again.',
          db_error:           'Something went wrong on our end. Please call us at (505) 573-9275.',
        }
        setFormError(messages[data.error] ?? data.message ?? 'Something went wrong. Please try again.')
        // Re-check availability in case a concurrent booking just took the slot
        checkAvail()
      } else {
        setConfirmation({
          id:        data.id,
          craftName: craft.name,
          date,
          startHour: startHour as number,
          duration,
          name:      name.trim(),
        })
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <ConfirmScreen
        c={confirmation}
        onReset={() => {
          setConfirmation(null)
          setDate(''); setStartHour(null); setDuration(1)
          setName(''); setEmail(''); setPhone('')
          setAvail(null)
        }}
      />
    )
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      {/* ── Time ─────────────────────────────────────── */}
      <fieldset className="booking-fieldset">
        <legend className="booking-legend">Pick your time</legend>

        <div className="booking-row">
          <div className="booking-field">
            <label className="booking-label" htmlFor="bf-date">Date</label>
            <input
              id="bf-date"
              type="date"
              className="booking-input"
              min={minDate}
              value={date}
              onChange={e => { setDate(e.target.value); setAvail(null) }}
              required
            />
          </div>

          <div className="booking-field">
            <label className="booking-label" htmlFor="bf-start">Start time</label>
            <select
              id="bf-start"
              className="booking-select"
              value={startHour ?? ''}
              onChange={e => setStartHour(e.target.value === '' ? null : Number(e.target.value))}
              required
            >
              <option value="">— pick —</option>
              {START_HOURS.map(h => (
                <option key={h} value={h}>{hourLabel(h)}</option>
              ))}
            </select>
          </div>

          <div className="booking-field">
            <label className="booking-label" htmlFor="bf-duration">Duration</label>
            <select
              id="bf-duration"
              className="booking-select"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            >
              {validDurations().map(d => (
                <option key={d.hours} value={d.hours}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="booking-avail-row">
          <AvailBadge avail={avail} checking={checking} />
          {avail && !avail.blocked && (
            <span className="booking-avail-detail">
              {avail.booked} of {avail.total} booked · {avail.available} open
            </span>
          )}
        </div>
      </fieldset>

      {/* ── Customer info ─────────────────────────────── */}
      <fieldset className="booking-fieldset">
        <legend className="booking-legend">Your info</legend>

        <div className="booking-field">
          <label className="booking-label" htmlFor="bf-name">Full name</label>
          <input
            id="bf-name"
            type="text"
            className="booking-input"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="booking-row">
          <div className="booking-field">
            <label className="booking-label" htmlFor="bf-email">Email</label>
            <input
              id="bf-email"
              type="email"
              className="booking-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="booking-field">
            <label className="booking-label" htmlFor="bf-phone">Phone <span style={{ opacity: .5 }}>(optional)</span></label>
            <input
              id="bf-phone"
              type="tel"
              className="booking-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="(505) 000-0000"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Error + submit ────────────────────────────── */}
      {formError && (
        <p className="booking-error" role="alert">{formError}</p>
      )}

      <button
        type="submit"
        className="btn-reserve"
        style={{ width: '100%', maxWidth: 380, marginTop: '.5rem' }}
        disabled={!canSubmit}
      >
        {submitting ? 'Reserving…' : 'Reserve — confirm by phone'}
      </button>

      <p style={{
        fontFamily: 'var(--ff-mono)', fontSize: '.72rem',
        color: 'oklch(0.85 0.015 85 / .5)', marginTop: '.9rem',
      }}>
        No payment now — we&apos;ll call to confirm and collect payment at the launch.
      </p>
    </form>
  )
}
