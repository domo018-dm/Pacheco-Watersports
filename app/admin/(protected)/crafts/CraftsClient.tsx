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
    <div className="craft-adm-list">
      {crafts.map(c => {
        const busy = actionId === c.id && isPending
        return (
          <div key={c.id} className="craft-adm-card" style={{ opacity: c.active ? 1 : 0.5 }}>
            {/* Thumbnail */}
            <div className="craft-adm-img">
              {c.image_url ? (
                <Image src={c.image_url} alt={c.name} fill style={{ objectFit: 'cover' }} />
              ) : (
                <div className="craft-adm-img-placeholder">NO<br/>PHOTO</div>
              )}
            </div>

            {/* Body */}
            <div className="craft-adm-body">
              <div className="craft-adm-top">
                <div>
                  <div className="craft-adm-name">{c.name}</div>
                  <div className="craft-adm-slug">{c.id}</div>
                </div>
                <div className="craft-adm-badges">
                  <span className={`badge ${c.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                    {c.active ? 'Active' : 'Hidden'}
                  </span>
                  {c.hourly_rate && (
                    <span className="craft-adm-rate">${c.hourly_rate}/hr</span>
                  )}
                </div>
              </div>

              <div className="craft-adm-meta">
                <span>{c.type.toUpperCase()} · {c.class_label}</span>
                <span>{c.seats} seats</span>
                <span>{c.total_units} unit{c.total_units !== 1 ? 's' : ''}</span>
                <span className="craft-adm-sort">sort {c.sort_order}</span>
              </div>

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
            </div>
          </div>
        )
      })}
    </div>
  )
}
