'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTransition, useState } from 'react'
import { deleteCraft, toggleCraftActive } from '@/app/admin/actions'
import type { Craft } from '@/types'

export default function CraftsClient({ crafts }: { crafts: Craft[] }) {
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  function handleToggle(id: string, active: boolean) {
    setActionId(id)
    startTransition(async () => { await toggleCraftActive(id, active); setActionId(null) })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setActionId(id)
    startTransition(async () => { await deleteCraft(id); setActionId(null) })
  }

  if (crafts.length === 0) return <p className="adm-empty">No crafts yet — add one above</p>

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Photo</th><th>Name</th><th>Type</th><th>Rate</th>
            <th>Units</th><th>Sort</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {crafts.map(c => {
            const busy = actionId === c.id && isPending
            return (
              <tr key={c.id} style={{ opacity: c.active ? 1 : .5 }}>
                <td style={{ width: 56 }}>
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} width={48} height={36}
                      style={{ objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: 48, height: 36, background: 'var(--ink)', border: '1px solid var(--line)' }} />
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: '.75rem', color: 'oklch(0.85 0.015 85 / .45)', fontFamily: 'var(--ff-mono)' }}>
                    {c.id}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '.75rem' }}>
                  {c.type} / {c.class_label}
                </td>
                <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '.82rem' }}>
                  {c.hourly_rate ? `$${c.hourly_rate}/hr` : '—'}
                </td>
                <td style={{ fontFamily: 'var(--ff-mono)', textAlign: 'center' }}>{c.total_units}</td>
                <td style={{ fontFamily: 'var(--ff-mono)', textAlign: 'center', color: 'oklch(0.85 0.015 85 / .4)' }}>{c.sort_order}</td>
                <td>
                  <span className={`badge ${c.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                    {c.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div className="adm-actions-row">
                    <Link href={`/admin/crafts/${c.id}`} className="adm-btn adm-btn-ghost adm-btn-sm">
                      Edit
                    </Link>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy}
                      onClick={() => handleToggle(c.id, !c.active)}>
                      {busy ? '…' : c.active ? 'Hide' : 'Show'}
                    </button>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy}
                      onClick={() => handleDelete(c.id, c.name)}>
                      {busy ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
