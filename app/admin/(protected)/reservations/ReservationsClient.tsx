'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition, useState } from 'react'
import { updateReservationStatus } from '@/app/admin/actions'

interface Craft { id: string; name: string }
interface Reservation {
  id: string; craft_id: string; customer_name: string; customer_email: string
  customer_phone: string | null; start_time: string; end_time: string
  status: string; payment_status: string | null; amount_cents: number | null
  created_at: string
  crafts: { name: string; type: string } | null
}
interface Filters { status?: string; craftId?: string; from?: string; to?: string }

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtAmt(cents: number | null) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(0)}`
}
function refCode(id: string) { return id.split('-')[0].toUpperCase() }

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
    startTransition(async () => {
      await updateReservationStatus(id, status)
      setActionId(null)
    })
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
          <button className="adm-btn adm-btn-ghost adm-btn-sm"
            onClick={() => router.push(pathname)}>
            Reset
          </button>
        </div>

        {/* Table */}
        {reservations.length === 0 ? (
          <p className="adm-empty">No reservations match these filters</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Ref</th><th>Time</th><th>Craft</th>
                  <th>Customer</th><th>Phone</th><th>Email</th>
                  <th>Paid</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => {
                  const busy = actionId === r.id && isPending
                  return (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '.72rem', color: 'var(--amber)', letterSpacing: '.1em' }}>
                        {refCode(r.id)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span>{fmt(r.start_time)}</span>
                        <span style={{ color: 'oklch(0.85 0.015 85 / .4)', display: 'block', fontSize: '.78rem' }}>
                          → {new Date(r.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>{r.crafts?.name ?? r.craft_id}</td>
                      <td>{r.customer_name}</td>
                      <td style={{ fontSize: '.82rem' }}>{r.customer_phone ?? '—'}</td>
                      <td style={{ fontSize: '.82rem' }}>{r.customer_email}</td>
                      <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '.82rem' }}>
                        {fmtAmt(r.amount_cents)}
                        {r.payment_status && (
                          <span style={{ display: 'block', fontSize: '.65rem', color: 'oklch(0.85 0.015 85 / .4)', letterSpacing: '.08em' }}>
                            {r.payment_status}
                          </span>
                        )}
                      </td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td>
                        <div className="adm-actions-row">
                          {r.status === 'confirmed' && (
                            <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy}
                              onClick={() => handleStatus(r.id, 'completed')}>
                              {busy ? '…' : 'Complete'}
                            </button>
                          )}
                          {(r.status === 'pending' || r.status === 'confirmed') && (
                            <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy}
                              onClick={() => { if (confirm('Cancel this reservation?')) handleStatus(r.id, 'cancelled') }}>
                              {busy ? '…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
