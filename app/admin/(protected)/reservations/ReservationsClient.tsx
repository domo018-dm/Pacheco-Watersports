'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useState } from 'react'
import { updateReservationStatus, refundReservation } from '@/app/admin/actions'

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

export default function ReservationsClient({
  reservations, crafts, filters,
}: { reservations: Reservation[]; crafts: Craft[]; filters: Filters }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const [refunding,     setRefunding]     = useState<Reservation | null>(null)
  const [refundAmount,  setRefundAmount]  = useState('')
  const [refundError,   setRefundError]   = useState<string | null>(null)
  const [refundPending, setRefundPending] = useState(false)

  function applyFilters(next: Partial<Filters>) {
    const merged = { ...filters, ...next }
    const params = new URLSearchParams()
    if (merged.status)  params.set('status',  merged.status)
    if (merged.craftId) params.set('craftId', merged.craftId)
    if (merged.from)    params.set('from',    merged.from)
    if (merged.to)      params.set('to',      merged.to)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleStatus(id: string, status: string) {
    setActionId(id)
    startTransition(async () => { await updateReservationStatus(id, status); setActionId(null) })
  }

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

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">Reservations</h1>
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '.7rem', color: 'oklch(0.85 0.015 85 / .4)' }}>
          {reservations.length} row{reservations.length !== 1 ? 's' : ''}
        </span>
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

        {/* Cards */}
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

              return (
                <div key={r.id} className="res-card">
                  {/* Header row */}
                  <div className="res-card-head">
                    <span className="res-ref">{refCode(r.id)}</span>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  </div>

                  {/* Date + craft */}
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

                  {/* Contact */}
                  <div className="res-contact">
                    {r.customer_phone && <span>{r.customer_phone}</span>}
                    <span>{r.customer_email}</span>
                  </div>

                  {/* Footer: amount + actions */}
                  <div className="res-card-foot">
                    <div className="res-amount-block">
                      <span className="res-amount">{fmtAmt(r.amount_cents)}</span>
                      {r.payment_status && (
                        <span className="res-pay-label" style={{ color: payStatusColor(r.payment_status) }}>
                          {r.payment_status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {refundedCents > 0 && (
                        <span className="res-pay-label" style={{ color: 'oklch(0.72 0.15 15)' }}>
                          −{fmtAmt(refundedCents)} refunded
                        </span>
                      )}
                    </div>

                    <div className="adm-actions-row">
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

      {/* Refund panel */}
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
