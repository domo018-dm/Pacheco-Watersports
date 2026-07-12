'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createAuthBrowserClient } from '@/lib/supabase/ssr-client'
import { createLandJob, deleteLandJob, toggleLandJobActive, moveLandJob } from '@/app/admin/actions'
import type { LandJob } from '@/types'

const supabase = createAuthBrowserClient()

// Photos live in the shared craft-images bucket under a land-jobs/ prefix.
async function uploadPhoto(kind: 'before' | 'after', file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `land-jobs/${crypto.randomUUID()}-${kind}.${ext}`
  const { error } = await supabase.storage
    .from('craft-images')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from('craft-images').getPublicUrl(path).data.publicUrl
}

export default function LandJobsManager({ jobs }: { jobs: LandJob[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionId, setActionId] = useState<string | null>(null)

  const [title,       setTitle]       = useState('')
  const [beforeFile,  setBeforeFile]  = useState<File | null>(null)
  const [afterFile,   setAfterFile]   = useState<File | null>(null)
  const [beforePrev,  setBeforePrev]  = useState<string | null>(null)
  const [afterPrev,   setAfterPrev]   = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef  = useRef<HTMLInputElement>(null)

  function pick(kind: 'before' | 'after', file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      if (kind === 'before') { setBeforeFile(file); setBeforePrev(url) }
      else                   { setAfterFile(file);  setAfterPrev(url) }
    }
    reader.readAsDataURL(file)
  }

  async function handleAdd() {
    if (!beforeFile || !afterFile) { setError('Please choose both a before and an after photo.'); return }
    setError(null); setSaving(true)
    try {
      const [before_url, after_url] = await Promise.all([
        uploadPhoto('before', beforeFile),
        uploadPhoto('after',  afterFile),
      ])
      const res = await createLandJob({ title, before_url, after_url })
      if (res.error) { setError(res.error); setSaving(false); return }
      setTitle(''); setBeforeFile(null); setAfterFile(null); setBeforePrev(null); setAfterPrev(null)
      if (beforeRef.current) beforeRef.current.value = ''
      if (afterRef.current)  afterRef.current.value = ''
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  function run(id: string, fn: () => Promise<unknown>) {
    setActionId(id)
    startTransition(async () => { await fn(); setActionId(null); router.refresh() })
  }

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">Land Jobs</h1>
      </div>

      <div className="adm-content">
        {/* ── Add a new before/after ─────────────────────────────────────── */}
        <div className="adm-settings-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="adm-settings-subheading">Add a before / after</h3>
          <p className="adm-settings-hint">
            Upload a &ldquo;before&rdquo; and an &ldquo;after&rdquo; photo of the same job. It appears as a
            drag-to-reveal slider in the Skid Steer section.
          </p>

          <div className="adm-edit-grid" style={{ marginTop: '.75rem' }}>
            <div className="adm-field">
              <label className="adm-label">Before photo *</label>
              {beforePrev && <Image src={beforePrev} alt="before preview" width={280} height={170}
                style={{ objectFit: 'cover', width: '100%', height: 150, marginBottom: '.4rem' }} />}
              <input ref={beforeRef} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={e => pick('before', e.target.files?.[0])} />
            </div>
            <div className="adm-field">
              <label className="adm-label">After photo *</label>
              {afterPrev && <Image src={afterPrev} alt="after preview" width={280} height={170}
                style={{ objectFit: 'cover', width: '100%', height: 150, marginBottom: '.4rem' }} />}
              <input ref={afterRef} type="file" accept="image/jpeg,image/png,image/webp"
                onChange={e => pick('after', e.target.files?.[0])} />
            </div>
          </div>

          <div className="adm-field" style={{ marginTop: '.75rem' }}>
            <label className="adm-label">Caption <span style={{ fontWeight: 400, opacity: .5 }}>— optional</span></label>
            <input className="adm-input" placeholder="e.g. Overgrown lot cleared · Conchas Lake"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {error && <p className="adm-error" style={{ marginTop: '.6rem' }}>{error}</p>}

          <div className="adm-actions-row" style={{ marginTop: '1rem' }}>
            <button className="adm-btn" onClick={handleAdd} disabled={saving || !beforeFile || !afterFile}>
              {saving ? 'Uploading…' : 'Add before / after'}
            </button>
          </div>
        </div>

        {/* ── Existing jobs ──────────────────────────────────────────────── */}
        {jobs.length === 0 ? (
          <p className="adm-empty">No before/after jobs yet — add one above.</p>
        ) : (
          <div className="craft-adm-list">
            {jobs.map((j, i) => {
              const busy = actionId === j.id && isPending
              return (
                <div key={j.id} className="craft-adm-card" style={{ opacity: j.active ? 1 : 0.5 }}>
                  <div className="craft-adm-img" style={{ position: 'relative' }}>
                    <Image src={j.before_url} alt="before" fill style={{ objectFit: 'cover', clipPath: 'inset(0 50% 0 0)' }} />
                    <Image src={j.after_url}  alt="after"  fill style={{ objectFit: 'cover', clipPath: 'inset(0 0 0 50%)' }} />
                  </div>
                  <div className="craft-adm-body">
                    <div className="craft-adm-top">
                      <div>
                        <div className="craft-adm-name">{j.title || 'Untitled job'}</div>
                        <div className="craft-adm-slug">before / after</div>
                      </div>
                      <div className="craft-adm-badges">
                        <span className={`badge ${j.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                          {j.active ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                    <div className="adm-actions-row">
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy || i === 0}
                        onClick={() => run(j.id, () => moveLandJob(j.id, 'up'))} title="Move up">↑</button>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy || i === jobs.length - 1}
                        onClick={() => run(j.id, () => moveLandJob(j.id, 'down'))} title="Move down">↓</button>
                      <button className="adm-btn adm-btn-ghost adm-btn-sm" disabled={busy}
                        onClick={() => run(j.id, () => toggleLandJobActive(j.id, !j.active))}>
                        {busy ? '…' : j.active ? 'Hide' : 'Show'}
                      </button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy}
                        onClick={() => { if (confirm('Delete this before/after?')) run(j.id, () => deleteLandJob(j.id)) }}>
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
