'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTikTok, deleteTikTok, toggleTikTokActive, moveTikTok } from '@/app/admin/actions'
import type { TikTok } from '@/types'

export default function TikToksManager({ tiktoks }: { tiktoks: TikTok[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const [url,     setUrl]     = useState('')
  const [caption, setCaption] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleAdd() {
    if (!url.trim()) { setError('Paste a TikTok link first.'); return }
    setError(null); setSaving(true)
    const res = await createTikTok(url, caption)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setUrl(''); setCaption('')
    router.refresh()
  }

  function run(id: string, fn: () => Promise<unknown>) {
    setActionId(id)
    startTransition(async () => { await fn(); setActionId(null); router.refresh() })
  }

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">TikToks</h1>
      </div>

      <div className="adm-content">
        {/* ── Add a TikTok ───────────────────────────────────────────────── */}
        <div className="lj-add">
          <h3 className="adm-settings-subheading">Add a TikTok</h3>

          <div className="lj-step">
            <div className="lj-step-title">
              <span className="lj-step-num">1</span>
              <span>Paste the link</span>
              <span className="lj-tag lj-tag--req">Required</span>
            </div>
            <p className="lj-step-help">
              In the TikTok app, open your video, tap <strong>Share</strong> → <strong>Copy link</strong>,
              then paste it here.
            </p>
            <input
              className="adm-input" type="url" inputMode="url" autoComplete="off"
              placeholder="https://www.tiktok.com/@pacheco/video/…"
              value={url} onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div className="lj-step">
            <div className="lj-step-title">
              <span className="lj-step-num">2</span>
              <span>Caption</span>
              <span className="lj-tag lj-tag--opt">Optional</span>
            </div>
            <input
              className="adm-input"
              placeholder="e.g. Clearing a lot in Conchas"
              value={caption} onChange={e => setCaption(e.target.value)}
            />
          </div>

          {error && <p className="adm-error" style={{ marginTop: '.4rem' }}>{error}</p>}

          <button className="lj-submit" onClick={handleAdd} disabled={saving || !url.trim()}>
            {saving ? 'Adding…' : 'Add to site'}
          </button>
        </div>

        {/* ── Existing TikToks ───────────────────────────────────────────── */}
        {tiktoks.length === 0 ? (
          <p className="adm-empty">No TikToks yet — paste a link above.</p>
        ) : (
          <div className="tk-adm-list">
            {tiktoks.map((t, i) => {
              const busy = actionId === t.id && isPending
              return (
                <div key={t.id} className="tk-adm-card" style={{ opacity: t.active ? 1 : 0.5 }}>
                  <div className="tk-adm-body">
                    <div className="tk-adm-top">
                      <div className="tk-adm-info">
                        <div className="craft-adm-name">{t.caption || 'TikTok video'}</div>
                        <a className="tk-adm-link" href={t.url} target="_blank" rel="noopener noreferrer">
                          Open video ↗
                        </a>
                      </div>
                      <span className={`badge ${t.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {t.active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <div className="adm-actions-row">
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy || i === 0}
                        onClick={() => run(t.id, () => moveTikTok(t.id, 'up'))} title="Move up">↑</button>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy || i === tiktoks.length - 1}
                        onClick={() => run(t.id, () => moveTikTok(t.id, 'down'))} title="Move down">↓</button>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy}
                        onClick={() => run(t.id, () => toggleTikTokActive(t.id, !t.active))}>
                        {busy ? '…' : t.active ? 'Hide' : 'Show'}
                      </button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy}
                        onClick={() => { if (confirm('Remove this TikTok?')) run(t.id, () => deleteTikTok(t.id)) }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
