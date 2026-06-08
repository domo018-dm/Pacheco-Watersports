'use client'

import { useState, useTransition } from 'react'
import { createBlock, deleteBlock } from '@/app/admin/actions'

interface Craft { id: string; name: string }
interface Block {
  id: string; craft_id: string | null; start_time: string; end_time: string
  reason: string | null; created_at: string
  crafts: { name: string } | null
}

function fmtRange(start: string, end: string) {
  const s = new Date(start), e = new Date(end)
  const sameDay = s.toDateString() === e.toDateString()
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
  if (sameDay) {
    return `${s.toLocaleDateString('en-US', { ...dateOpts, year: 'numeric' })} · ${s.toLocaleTimeString('en-US', timeOpts)} – ${e.toLocaleTimeString('en-US', timeOpts)}`
  }
  return `${s.toLocaleDateString('en-US', dateOpts)} ${s.toLocaleTimeString('en-US', timeOpts)} → ${e.toLocaleDateString('en-US', dateOpts)} ${e.toLocaleTimeString('en-US', timeOpts)}`
}

export default function BlocksManager({ blocks, crafts }: { blocks: Block[]; crafts: Craft[] }) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [craftId,   setCraftId]   = useState<string>('')
  const [reason,    setReason]    = useState('')
  const [startDt,   setStartDt]   = useState('')
  const [endDt,     setEndDt]     = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [creating,  setCreating]  = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!startDt || !endDt) { setFormError('Both date/time fields are required'); return }
    const start = new Date(startDt), end = new Date(endDt)
    if (end <= start) { setFormError('End must be after start'); return }
    setCreating(true)
    const result = await createBlock({
      craft_id:   craftId || null,
      reason:     reason.trim() || null,
      start_time: start.toISOString(),
      end_time:   end.toISOString(),
    })
    setCreating(false)
    if (result.error) { setFormError(result.error); return }
    setCraftId(''); setReason(''); setStartDt(''); setEndDt('')
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this block?')) return
    setDeletingId(id)
    startTransition(async () => { await deleteBlock(id); setDeletingId(null) })
  }

  return (
    <div style={{ display: 'grid', gap: '2.5rem' }}>

      {/* Create form */}
      <div>
        <p className="adm-section-title">Create block</p>
        <form onSubmit={handleCreate} className="adm-form" style={{ maxWidth: 560 }}>
          {formError && <p className="adm-error">{formError}</p>}
          <div className="adm-field">
            <label className="adm-label">Craft (leave blank to block all)</label>
            <select className="adm-select" value={craftId} onChange={e => setCraftId(e.target.value)}>
              <option value="">— All crafts (site-wide closure) —</option>
              {crafts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label className="adm-label">Start</label>
              <input type="datetime-local" className="adm-input"
                value={startDt} onChange={e => setStartDt(e.target.value)} required />
            </div>
            <div className="adm-field">
              <label className="adm-label">End</label>
              <input type="datetime-local" className="adm-input"
                value={endDt} onChange={e => setEndDt(e.target.value)} required />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-label">Reason (optional)</label>
            <input className="adm-input" placeholder="Maintenance, weather, owner time off…"
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <button type="submit" className="adm-btn" disabled={creating}>
            {creating ? 'Creating…' : 'Block this time'}
          </button>
        </form>
        <p style={{ marginTop: '.75rem', fontFamily: 'var(--ff-mono)', fontSize: '.68rem', color: 'oklch(0.85 0.015 85 / .4)' }}>
          Blocked slots are immediately hidden from public booking — no restart needed.
        </p>
      </div>

      {/* Block list */}
      <div>
        <p className="adm-section-title">Active blocks ({blocks.length})</p>
        {blocks.length === 0 ? (
          <p className="adm-empty">No blocks scheduled</p>
        ) : (
          <div className="block-list">
            {blocks.map(b => {
              const deleting = deletingId === b.id && isPending
              return (
                <div key={b.id} className="block-item">
                  <span className={`block-scope ${b.craft_id ? 'block-scope-craft' : 'block-scope-all'}`}>
                    {b.craft_id ? (b.crafts?.name ?? b.craft_id) : 'ALL CRAFTS'}
                  </span>
                  <div className="block-body">
                    <div className="block-time">{fmtRange(b.start_time, b.end_time)}</div>
                    {b.reason && <div className="block-reason">{b.reason}</div>}
                  </div>
                  <button
                    className="adm-btn adm-btn-danger adm-btn-sm"
                    disabled={deleting}
                    onClick={() => handleDelete(b.id)}
                  >
                    {deleting ? '…' : 'Remove'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
