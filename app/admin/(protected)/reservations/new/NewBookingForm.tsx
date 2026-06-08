'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createAdminReservation } from '@/app/admin/actions'

interface Craft { id: string; name: string }
interface SlotAvail { hour: number; available: number; blocked: boolean }

const HOURS     = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
const DURATIONS = [1, 2, 3, 4]

function pad(n: number) { return String(n).padStart(2, '0') }
function toISO(date: string, hour: number) {
  return new Date(`${date}T${pad(hour)}:00:00`).toISOString()
}
function midnightISO(date: string) {
  return new Date(`${date}T00:00:00`).toISOString()
}
function hourLabel(h: number) {
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`
}

export default function NewBookingForm({ crafts }: { crafts: Craft[] }) {
  const router = useRouter()

  const [craftId,   setCraftId]   = useState(crafts[0]?.id ?? '')
  const [date,      setDate]      = useState('')
  const [duration,  setDuration]  = useState(2)
  const [hour,      setHour]      = useState<number | null>(null)
  const [slots,     setSlots]     = useState<SlotAvail[]>([])
  const [slotsLoad, setSlotsLoad] = useState(false)

  const [name,      setName]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [email,     setEmail]     = useState('')
  const [notes,     setNotes]     = useState('')

  const [pending,   setPending]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const fetchSlots = useCallback(async (cId: string, d: string, dur: number) => {
    if (!cId || !d) { setSlots([]); return }
    setSlotsLoad(true)
    try {
      const res  = await fetch(
        `/api/availability/day?craftId=${encodeURIComponent(cId)}&baseTs=${encodeURIComponent(midnightISO(d))}&duration=${dur}`
      )
      const data = await res.json()
      if (Array.isArray(data.slots)) setSlots(data.slots)
    } catch { setSlots([]) }
    finally  { setSlotsLoad(false) }
  }, [])

  useEffect(() => { fetchSlots(craftId, date, duration) }, [craftId, date, duration, fetchSlots])

  async function handleSubmit() {
    if (!craftId || !date || hour === null || !name.trim()) {
      setError('Please fill in all required fields and select a start time.')
      return
    }
    setPending(true)
    setError(null)

    const startTime = toISO(date, hour)
    const endTime   = toISO(date, hour + duration)

    const result = await createAdminReservation({
      craftId, startTime, endTime,
      customerName:  name.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.trim(),
      notes:         notes.trim(),
    })

    setPending(false)
    if (result.error) { setError(result.error); return }
    router.push('/admin/reservations')
  }

  const validHours = HOURS.filter(h => h + duration <= 18)

  return (
    <div className="adm-new-booking-form">

      <section>
        <p className="adm-form-section-title">Reservation details</p>

        <div className="adm-edit-grid">
          <div className="adm-field">
            <label className="adm-label">Craft *</label>
            <select className="adm-select" value={craftId}
              onChange={e => { setCraftId(e.target.value); setHour(null) }}>
              {crafts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label">Date *</label>
            <input type="date" className="adm-input" value={date}
              onChange={e => { setDate(e.target.value); setHour(null) }} />
          </div>
        </div>

        <div className="adm-field" style={{ marginTop: '.75rem' }}>
          <label className="adm-label">Duration *</label>
          <div className="adm-dur-pills">
            {DURATIONS.map(d => (
              <button key={d} type="button"
                className={`adm-dur-pill${duration === d ? ' active' : ''}`}
                onClick={() => { setDuration(d); setHour(null) }}>
                {d} hr
              </button>
            ))}
          </div>
        </div>

        <div className="adm-field" style={{ marginTop: '.75rem' }}>
          <label className="adm-label">
            Start time *
            {slotsLoad && (
              <span style={{ fontWeight: 400, color: 'oklch(0.85 0.015 85 / .35)', marginLeft: '.5rem' }}>
                checking…
              </span>
            )}
          </label>
          {!date ? (
            <p className="adm-edit-hint">Pick a date to see available times</p>
          ) : (
            <div className="adm-slot-grid">
              {validHours.map(h => {
                const slot       = slots.find(s => s.hour === h)
                const available  = slot?.available ?? (slotsLoad ? 99 : 0)
                const blocked    = slot?.blocked   ?? false
                const isDisabled = !slotsLoad && (available === 0 || blocked)
                const isFew      = !slotsLoad && !isDisabled && available === 1
                return (
                  <button
                    key={h} type="button"
                    className={`adm-slot${hour === h ? ' active' : ''}${isFew ? ' few' : ''}${isDisabled ? ' disabled' : ''}${slotsLoad ? ' loading' : ''}`}
                    disabled={isDisabled}
                    title={blocked ? 'Blocked' : available === 0 ? 'Fully booked' : undefined}
                    onClick={() => { setHour(h); setError(null) }}
                  >
                    {hourLabel(h)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: '1.75rem' }}>
        <p className="adm-form-section-title">Customer</p>

        <div className="adm-edit-grid">
          <div className="adm-field">
            <label className="adm-label">Name *</label>
            <input type="text" className="adm-input" placeholder="Full name"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="adm-field">
            <label className="adm-label">Phone</label>
            <input type="tel" className="adm-input" placeholder="(505) 555-0100"
              value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="adm-field" style={{ marginTop: '.75rem' }}>
          <label className="adm-label">
            Email{' '}
            <span style={{ fontWeight: 400, opacity: .5 }}>— optional</span>
          </label>
          <input type="email" className="adm-input" placeholder="customer@example.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="adm-field" style={{ marginTop: '.75rem' }}>
          <label className="adm-label">
            Notes{' '}
            <span style={{ fontWeight: 400, opacity: .5 }}>— optional</span>
          </label>
          <input type="text" className="adm-input" placeholder="e.g. pay at launch, life jacket needed"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </section>

      {error && <p className="adm-error" style={{ marginTop: '.75rem' }}>{error}</p>}

      <div className="adm-actions-row" style={{ marginTop: '1.5rem' }}>
        <button
          className="adm-btn"
          onClick={handleSubmit}
          disabled={pending || !name.trim() || hour === null || !date}>
          {pending ? 'Creating…' : 'Create booking'}
        </button>
        <button
          className="adm-btn adm-btn-ghost"
          onClick={() => router.push('/admin/reservations')}
          disabled={pending}>
          Cancel
        </button>
      </div>

      <p style={{ marginTop: '1rem', fontSize: '.72rem', color: 'oklch(0.85 0.015 85 / .35)', fontFamily: 'var(--ff-mono)' }}>
        Booking will be confirmed immediately. Payment collected in person.
      </p>

    </div>
  )
}
