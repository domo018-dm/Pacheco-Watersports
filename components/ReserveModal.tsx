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
interface Confirmation { id: string; craftName: string; date: string; startHour: number; duration: number; name: string }

// ── Confirmation screen ───────────────────────────────────────────────────────
function ConfirmScreen({ c, onClose }: { c: Confirmation; onClose: () => void }) {
  const dateStr  = new Date(`${c.date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const refCode  = c.id.split('-')[0].toUpperCase()
  const startStr = hourLabel(c.startHour)
  const endStr   = hourLabel(c.startHour + c.duration)

  return (
    <div>
      <div style={{ fontSize: '2.4rem', color: 'var(--water)', marginBottom: '.8rem', lineHeight: 1 }}>✓</div>
      <h3 style={{ marginBottom: '.4rem' }}>You&apos;re set, {c.name.split(' ')[0]}!</h3>
      <p className="modal-sub">We&apos;ll call to confirm — usually within the hour.</p>

      <div style={{
        border: '1px solid oklch(0.85 0.015 85 / .14)',
        padding: '1rem 1.2rem',
        display: 'flex', flexDirection: 'column', gap: '.7rem',
        marginBottom: '1.4rem',
      }}>
        {[
          ['Ref #',  <span key="ref" style={{ fontFamily: 'var(--ff-mono)', letterSpacing: '.12em', color: 'var(--amber)' }}>{refCode}</span>],
          ['Craft',  c.craftName],
          ['Date',   dateStr],
          ['Time',   `${startStr} – ${endStr}`],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '.68rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'oklch(0.85 0.015 85 / .45)', flexShrink: 0 }}>
              {label}
            </span>
            <span style={{ fontSize: '.9rem', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-confirm" onClick={onClose}>Done</button>
        <p className="modal-call">
          Questions? <a href="tel:+15055739275">(505) 573-9275</a>
        </p>
      </div>
    </div>
  )
}

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

  const [submitting,   setSubmitting]   = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

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
      const res = await fetch('/api/reservations', {
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
          slot_blocked:       "That window isn’t available. Pick another.",
          craft_not_found:    'Craft not found. Close and try again.',
          db_error:           'Something went wrong. Call us at (505) 573-9275.',
        }
        setFormError(messages[data.error] ?? data.message ?? 'Something went wrong.')
        fetchSlots()
      } else {
        setConfirmation({ id: data.id, craftName: craft.name, date, startHour, duration, name: name.trim() })
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
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
          {confirmation ? (
            <ConfirmScreen c={confirmation} onClose={onClose} />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Header */}
              <p className="modal-eyebrow">{typeLabel} · {rateLabel}</p>
              <h3>{craft.name}</h3>
              <p className="modal-sub">
                {craft.seats} {craft.type === 'ski' ? 'riders' : 'passengers'} · {craft.description}
              </p>

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
                  {submitting ? 'Reserving…' : 'Reserve — confirm by phone'}
                </button>
                <p className="modal-call">
                  No payment now · we call to confirm ·{' '}
                  <a href="tel:+15055739275">(505) 573-9275</a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
