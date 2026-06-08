'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useState, useEffect, useCallback } from 'react'
import { updateReservationStatus, editReservation, refundReservation, generatePaymentLink, sendPaymentLinkEmail } from '@/app/admin/actions'

interface Craft { id: string; name: string }
interface Reservation {
  id: string; craft_id: string; customer_name: string; customer_email: string
  customer_phone: string | null; start_time: string; end_time: string
  status: string; payment_status: string | null; amount_cents: number | null
  refunded_cents: number | null; stripe_payment_intent_id: string | null
  created_at: string
  crafts: { name: string; type: string } | null
}
interface Filters { status?: string; craftId?: string; from?: string; to?: string }
interface SlotAvail { hour: number; available: number; blocked: boolean }

// ── Helpers ───────────────────────────────────────────────────────────────────
const HOURS     = [8,9,10,11,12,13,14,15,16,17]
const DURATIONS = [1,2,3,4]

function pad(n: number) { return String(n).padStart(2, '0') }
function localDateStr(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}
function localHour(iso: string) { return new Date(iso).getHours() }
function durationHours(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000)
}
function toISO(date: string, hour: number) {
  return new Date(`${date}T${pad(hour)}:00:00`).toISOString()
}
function midnightISO(date: string) {
  return new Date(`${date}T00:00:00`).toISOString()
}
function hourLabel(h: number) {
  return `${h > 12 ? h-12 : h === 0 ? 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtAmt(cents: number | null | undefined) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}
function refCode(id: string) { return id.split('-')[0].toUpperCase() }
function payStatusColor(s: string) {
  if (s === 'refunded')           return 'oklch(0.72 0.15 15)'
  if (s === 'partially_refunded') return 'var(--amber)'
  return 'oklch(0.85 0.015 85 / .4)'
}

const STATUS_OPTS = [
  { value: '',          label: 'All statuses' },
  { value: 'pending',   label: 'Pending'      },
  { value: 'confirmed', label: 'Confirmed'    },
  { value: 'cancelled', label: 'Cancelled'    },
  { value: 'completed', label: 'Completed'    },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReservationsClient({
  reservations, crafts, filters,
}: { reservations: Reservation[]; crafts: Craft[]; filters: Filters }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  // ── Edit panel state ───────────────────────────────────────────────────────
  const [editing,       setEditing]       = useState<Reservation | null>(null)
  const [editCraftId,   setEditCraftId]   = useState('')
  const [editDate,      setEditDate]      = useState('')
  const [editDuration,  setEditDuration]  = useState(2)
  const [editHour,      setEditHour]      = useState<number | null>(null)
  const [editSlots,     setEditSlots]     = useState<SlotAvail[]>([])
  const [editSlotsLoad, setEditSlotsLoad] = useState(false)
  const [editError,     setEditError]     = useState<string | null>(null)
  const [editPending,   setEditPending]   = useState(false)

  // ── Pay link panel state ───────────────────────────────────────────────────
  const [payLink,        setPayLink]        = useState<{ reservationId: string; name: string; email?: string; url?: string; error?: string } | null>(null)
  const [payLinkPending, setPayLinkPending] = useState<string | null>(null)
  const [copied,         setCopied]         = useState(false)
  const [emailSending,   setEmailSending]   = useState(false)
  const [emailSent,      setEmailSent]      = useState(false)
  const [emailError,     setEmailError]     = useState<string | null>(null)

  // ── Refund panel state ─────────────────────────────────────────────────────
  const [refunding,     setRefunding]     = useState<Reservation | null>(null)
  const [refundAmount,  setRefundAmount]  = useState('')
  const [refundError,   setRefundError]   = useState<string | null>(null)
  const [refundPending, setRefundPending] = useState(false)

  // ── Fetch slots when edit craft / date / duration changes ──────────────────
  const fetchEditSlots = useCallback(async (craftId: string, date: string, dur: number) => {
    if (!craftId || !date) { setEditSlots([]); return }
    setEditSlotsLoad(true)
    try {
      const res  = await fetch(
        `/api/availability/day?craftId=${encodeURIComponent(craftId)}&baseTs=${encodeURIComponent(midnightISO(date))}&duration=${dur}`
      )
      const data = await res.json()
      if (Array.isArray(data.slots)) setEditSlots(data.slots)
    } catch { setEditSlots([]) }
    finally  { setEditSlotsLoad(false) }
  }, [])

  useEffect(() => {
    if (editing) fetchEditSlots(editCraftId, editDate, editDuration)
  }, [editing, editCraftId, editDate, editDuration, fetchEditSlots])

  // ── Filter helpers ─────────────────────────────────────────────────────────
  function applyFilters(next: Partial<Filters>) {
    const merged = { ...filters, ...next }
    const params = new URLSearchParams()
    if (merged.status)  params.set('status',  merged.status)
    if (merged.craftId) params.set('craftId', merged.craftId)
    if (merged.from)    params.set('from',    merged.from)
    if (merged.to)      params.set('to',      merged.to)
    router.push(`${pathname}?${params.toString()}`)
  }

  // ── Status update ──────────────────────────────────────────────────────────
  function handleStatus(id: string, status: string) {
    setActionId(id)
    startTransition(async () => { await updateReservationStatus(id, status); setActionId(null) })
  }

  // ── Edit handlers ──────────────────────────────────────────────────────────
  function openEditPanel(r: Reservation) {
    setEditing(r)
    setEditCraftId(r.craft_id)
    setEditDate(localDateStr(r.start_time))
    setEditDuration(durationHours(r.start_time, r.end_time))
    setEditHour(localHour(r.start_time))
    setEditSlots([])
    setEditError(null)
  }

  function closeEditPanel() {
    setEditing(null)
    setEditError(null)
    setEditPending(false)
  }

  async function handleEdit() {
    if (!editing || editHour === null) return
    setEditError(null)
    setEditPending(true)

    const startTime = toISO(editDate, editHour)
    const endTime   = toISO(editDate, editHour + editDuration)

    const result = await editReservation(editing.id, editCraftId, startTime, endTime)
    setEditPending(false)

    if (result.error) { setEditError(result.error); return }
    closeEditPanel()
    router.refresh()
  }

  // ── Pay link handler ──────────────────────────────────────────────────────
  async function handleGeneratePayLink(r: Reservation) {
    setPayLinkPending(r.id)
    const result = await generatePaymentLink(r.id)
    setPayLinkPending(null)
    const email = r.customer_email && r.customer_email !== 'noemail' ? r.customer_email : undefined
    setPayLink({ reservationId: r.id, name: r.customer_name, email, ...result })
    setCopied(false)
    setEmailSent(false)
    setEmailError(null)
  }

  function closePayLink() { setPayLink(null); setCopied(false); setEmailSent(false); setEmailError(null) }

  async function handleSendEmail() {
    if (!payLink?.url || !payLink.reservationId) return
    setEmailSending(true)
    setEmailError(null)
    const result = await sendPaymentLinkEmail(payLink.reservationId, payLink.url)
    setEmailSending(false)
    if (result.error) { setEmailError(result.error); return }
    setEmailSent(true)
  }

  async function shareOrCopy(url: string) {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title: 'Complete your Pacheco Watersports booking' })
        return
      } catch { /* user cancelled share sheet — fall through to clipboard */ }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Refund handlers ────────────────────────────────────────────────────────
  function openRefundPanel(r: Reservation) {
    const remaining = (r.amount_cents ?? 0) - (r.refunded_cents ?? 0)
    setRefunding(r)
    setRefundAmount((remaining / 100).toFixed(2))
    setRefundError(null)
  }
  function closeRefundPanel() { setRefunding(null); setRefundError(null); setRefundPending(false) }

  async function handleRefund() {
    if (!refunding) return
    setRefundError(null)
    const amountCents = Math.round(parseFloat(refundAmount) * 100)
    const remaining   = (refunding.amount_cents ?? 0) - (refunding.refunded_cents ?? 0)
    if (isNaN(amountCents) || amountCents <= 0 || amountCents > remaining) {
      setRefundError(`Enter an amount between $0.01 and ${fmtAmt(remaining)}`)
      return
    }
    setRefundPending(true)
    const result = await refundReservation(refunding.id, amountCents)
    setRefundPending(false)
    if (result.error) { setRefundError(result.error); return }
    closeRefundPanel()
    router.refresh()
  }

  const editValidHours = HOURS.filter(h => h + editDuration <= 18)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">Reservations</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '.7rem', color: 'oklch(0.85 0.015 85 / .4)' }}>
            {reservations.length} row{reservations.length !== 1 ? 's' : ''}
          </span>
          <a href="/admin/reservations/new" className="adm-btn adm-btn-sm">
            + New booking
          </a>
        </div>
      </div>

      <div className="adm-content">
        {/* Filters */}
        <div className="adm-filter-bar">
          <div className="adm-field">
            <label className="adm-label">Status</label>
            <select className="adm-select" value={filters.status ?? ''}
              onChange={e => applyFilters({ status: e.target.value || undefined })}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label">Craft</label>
            <select className="adm-select" value={filters.craftId ?? ''}
              onChange={e => applyFilters({ craftId: e.target.value || undefined })}>
              <option value="">All crafts</option>
              {crafts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="adm-field">
            <label className="adm-label">From</label>
            <input type="date" className="adm-input" value={filters.from ?? ''}
              onChange={e => applyFilters({ from: e.target.value || undefined })} />
          </div>
          <div className="adm-field">
            <label className="adm-label">To</label>
            <input type="date" className="adm-input" value={filters.to ?? ''}
              onChange={e => applyFilters({ to: e.target.value || undefined })} />
          </div>
          <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => router.push(pathname)}>
            Reset
          </button>
        </div>

        {/* Reservation cards */}
        {reservations.length === 0 ? (
          <p className="adm-empty">No reservations match these filters</p>
        ) : (
          <div className="res-list">
            {reservations.map(r => {
              const busy          = actionId === r.id && isPending
              const refundedCents = r.refunded_cents ?? 0
              const remaining     = (r.amount_cents ?? 0) - refundedCents
              const canRefund     = (r.payment_status === 'paid' || r.payment_status === 'partially_refunded')
                                    && remaining > 0
              const canEdit       = r.status !== 'cancelled' && r.status !== 'completed'
              const canPayLink    = r.status === 'confirmed' && (r.payment_status === 'unpaid' || !r.payment_status)

              return (
                <div key={r.id} className="res-card">
                  <div className="res-card-head">
                    <span className="res-ref">{refCode(r.id)}</span>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>

                  <div className="res-card-main">
                    <div>
                      <div className="res-craft">{r.crafts?.name ?? r.craft_id}</div>
                      <div className="res-customer-name">{r.customer_name}</div>
                    </div>
                    <div className="res-time-block">
                      <div className="res-date">{fmtDate(r.start_time)}</div>
                      <div className="res-time">{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</div>
                    </div>
                  </div>

                  <div className="res-contact">
                    {r.customer_phone && <span>{r.customer_phone}</span>}
                    <span>{r.customer_email}</span>
                  </div>

                  <div className="res-card-foot">
                    <div className="res-amount-block">
                      <span className="res-amount">{fmtAmt(r.amount_cents)}</span>
                      {r.payment_status && (
                        <span className="res-pay-label" style={{ color: payStatusColor(r.payment_status) }}>
                          {r.payment_status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {refundedCents > 0 && (
                        <span className="res-pay-label" style={{ color: 'oklch(0.72 0.15 15)' }}>
                          −{fmtAmt(refundedCents)} refunded
                        </span>
                      )}
                    </div>

                    <div className="adm-actions-row">
                      {canEdit && (
                        <button className="adm-btn adm-btn-ghost adm-btn-sm"
                          onClick={() => openEditPanel(r)}>
                          Edit
                        </button>
                      )}
                      {canPayLink && (
                        <button
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          style={{ borderColor: 'var(--water)', color: 'var(--water)' }}
                          disabled={payLinkPending === r.id}
                          onClick={() => handleGeneratePayLink(r)}>
                          {payLinkPending === r.id ? '…' : 'Pay link'}
                        </button>
                      )}
                      {r.status === 'confirmed' && (
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy}
                          onClick={() => handleStatus(r.id, 'completed')}>
                          {busy ? '…' : 'Complete'}
                        </button>
                      )}
                      {canRefund && (
                        <button className="adm-btn adm-btn-ghost adm-btn-sm"
                          style={{ borderColor: 'oklch(0.72 0.15 15 / .6)', color: 'oklch(0.72 0.15 15)' }}
                          onClick={() => openRefundPanel(r)}>
                          Refund
                        </button>
                      )}
                      {(r.status === 'pending' || r.status === 'confirmed') && (
                        <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy}
                          onClick={() => { if (confirm('Cancel this reservation?')) handleStatus(r.id, 'cancelled') }}>
                          {busy ? '…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pay link panel ──────────────────────────────────────────────────── */}
      {payLink && (
        <>
          <div className="adm-overlay" onClick={closePayLink} aria-hidden="true" />
          <div className="adm-paylink-panel" role="dialog" aria-label="Payment link">
            <div className="adm-refund-head">
              <span className="adm-paylink-title">Payment Link</span>
              <button className="adm-side-close" onClick={closePayLink} aria-label="Close">×</button>
            </div>
            {payLink.error ? (
              <p className="adm-error">{payLink.error}</p>
            ) : (
              <>
                <p className="adm-refund-meta">
                  For <strong>{payLink.name}</strong> — expires in 24 hours.
                </p>
                <div className="adm-paylink-row">
                  <input
                    readOnly
                    className="adm-input adm-paylink-url"
                    value={payLink.url}
                    onFocus={e => e.target.select()}
                  />
                  <button
                    className="adm-btn adm-btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => shareOrCopy(payLink.url!)}>
                    {copied ? 'Copied!' : typeof navigator !== 'undefined' && 'share' in navigator ? 'Share' : 'Copy'}
                  </button>
                </div>
                {payLink.email && (
                  <div style={{ marginTop: '.75rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                    <button
                      className="adm-btn adm-btn-ghost adm-btn-sm"
                      style={{ borderColor: 'var(--water)', color: 'var(--water)' }}
                      disabled={emailSending || emailSent}
                      onClick={handleSendEmail}>
                      {emailSending ? 'Sending…' : emailSent ? '✓ Email sent' : `Email to ${payLink.email}`}
                    </button>
                    {emailError && <span style={{ fontSize: '.72rem', color: 'oklch(0.72 0.15 15)' }}>{emailError}</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Edit panel ──────────────────────────────────────────────────────── */}
      {editing && (
        <>
          <div className="adm-overlay" onClick={closeEditPanel} aria-hidden="true" />
          <div className="adm-edit-panel" role="dialog" aria-label="Edit reservation">

            <div className="adm-refund-head">
              <span className="adm-edit-title">Edit Reservation</span>
              <button className="adm-side-close" onClick={closeEditPanel} aria-label="Close">×</button>
            </div>

            <p className="adm-refund-meta" style={{ marginBottom: '1rem' }}>
              <strong>{editing.customer_name}</strong>{' · '}Ref {refCode(editing.id)}
            </p>

            <div className="adm-edit-grid">
              {/* Craft */}
              <div className="adm-field">
                <label className="adm-label">Craft</label>
                <select className="adm-select" value={editCraftId}
                  onChange={e => { setEditCraftId(e.target.value); setEditHour(null) }}>
                  {crafts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Date */}
              <div className="adm-field">
                <label className="adm-label">Date</label>
                <input type="date" className="adm-input" value={editDate}
                  onChange={e => { setEditDate(e.target.value); setEditHour(null) }} />
              </div>
            </div>

            {/* Duration */}
            <div className="adm-field" style={{ marginTop: '.75rem' }}>
              <label className="adm-label">Duration</label>
              <div className="adm-dur-pills">
                {DURATIONS.map(d => (
                  <button key={d} type="button"
                    className={`adm-dur-pill${editDuration === d ? ' active' : ''}`}
                    onClick={() => { setEditDuration(d); setEditHour(null) }}>
                    {d} hr
                  </button>
                ))}
              </div>
            </div>

            {/* Slot grid */}
            <div className="adm-field" style={{ marginTop: '.75rem' }}>
              <label className="adm-label">
                Start time
                {editSlotsLoad && (
                  <span style={{ fontWeight: 400, color: 'oklch(0.85 0.015 85 / .35)', marginLeft: '.5rem' }}>
                    checking…
                  </span>
                )}
              </label>
              {!editDate ? (
                <p className="adm-edit-hint">Pick a date to see available times</p>
              ) : (
                <div className="adm-slot-grid">
                  {editValidHours.map(h => {
                    const slot      = editSlots.find(s => s.hour === h)
                    const available = slot?.available ?? (editSlotsLoad ? 99 : 0)
                    const blocked   = slot?.blocked   ?? false
                    const isDisabled = !editSlotsLoad && (available === 0 || blocked)
                    const isFew      = !editSlotsLoad && !isDisabled && available === 1

                    return (
                      <button
                        key={h} type="button"
                        className={`adm-slot${editHour === h ? ' active' : ''}${isFew ? ' few' : ''}${isDisabled ? ' disabled' : ''}${editSlotsLoad ? ' loading' : ''}`}
                        disabled={isDisabled}
                        title={blocked ? 'Blocked' : available === 0 ? 'Fully booked' : undefined}
                        onClick={() => { setEditHour(h); setEditError(null) }}
                      >
                        {hourLabel(h)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {editError && (
              <p className="adm-error" style={{ marginTop: '.5rem' }}>{editError}</p>
            )}

            <div className="adm-actions-row" style={{ marginTop: '1rem' }}>
              <button className="adm-btn" onClick={handleEdit}
                disabled={editPending || editHour === null || !editDate}>
                {editPending ? 'Saving…' : 'Save changes'}
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={closeEditPanel} disabled={editPending}>
                Cancel
              </button>
            </div>

          </div>
        </>
      )}

      {/* ── Refund panel ────────────────────────────────────────────────────── */}
      {refunding && (
        <>
          <div className="adm-overlay" onClick={closeRefundPanel} aria-hidden="true" />
          <div className="adm-refund-panel" role="dialog" aria-label="Issue refund">
            <div className="adm-refund-head">
              <span className="adm-refund-title">Issue Refund</span>
              <button className="adm-side-close" onClick={closeRefundPanel} aria-label="Close">×</button>
            </div>
            <p className="adm-refund-meta">
              <strong>{refunding.customer_name}</strong>{' · '}
              {refunding.crafts?.name ?? refunding.craft_id}{' · '}
              Ref {refCode(refunding.id)}{' · '}
              {fmtDate(refunding.start_time)}
            </p>
            <div className="adm-refund-amounts">
              <span>Paid: <strong>{fmtAmt(refunding.amount_cents)}</strong></span>
              {(refunding.refunded_cents ?? 0) > 0 && (
                <span style={{ color: 'oklch(0.72 0.15 15)' }}>
                  Already refunded: <strong>{fmtAmt(refunding.refunded_cents)}</strong>
                </span>
              )}
              <span style={{ color: 'var(--amber)' }}>
                Remaining: <strong>{fmtAmt((refunding.amount_cents ?? 0) - (refunding.refunded_cents ?? 0))}</strong>
              </span>
            </div>
            <div className="adm-refund-row">
              <div className="adm-field" style={{ flex: '1 1 160px', maxWidth: 240 }}>
                <label className="adm-label">Amount ($)</label>
                <input type="number" className="adm-input" min="0.01" step="0.01"
                  value={refundAmount}
                  onChange={e => { setRefundAmount(e.target.value); setRefundError(null) }}
                  disabled={refundPending} />
              </div>
              <div className="adm-actions-row" style={{ paddingBottom: '1px' }}>
                <button className="adm-btn adm-btn-danger" onClick={handleRefund} disabled={refundPending}>
                  {refundPending ? 'Processing…' : 'Issue refund'}
                </button>
                <button className="adm-btn adm-btn-ghost" onClick={closeRefundPanel} disabled={refundPending}>
                  Cancel
                </button>
              </div>
            </div>
            {refundError && <p className="adm-error" style={{ marginTop: '.75rem' }}>{refundError}</p>}
          </div>
        </>
      )}
    </div>
  )
}
