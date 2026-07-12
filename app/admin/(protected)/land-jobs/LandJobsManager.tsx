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
  const beforeFileRef = useRef<HTMLInputElement>(null)
  const beforeCamRef  = useRef<HTMLInputElement>(null)
  const afterFileRef  = useRef<HTMLInputElement>(null)
  const afterCamRef   = useRef<HTMLInputElement>(null)

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
    if (!beforeFile) { setError('Please choose at least one photo.'); return }
    setError(null); setSaving(true)
    try {
      const before_url = await uploadPhoto('before', beforeFile)
      const after_url  = afterFile ? await uploadPhoto('after', afterFile) : null
      const res = await createLandJob({ title, before_url, after_url })
      if (res.error) { setError(res.error); setSaving(false); return }
      setTitle(''); setBeforeFile(null); setAfterFile(null); setBeforePrev(null); setAfterPrev(null)
      for (const r of [beforeFileRef, beforeCamRef, afterFileRef, afterCamRef]) {
        if (r.current) r.current.value = ''
      }
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
        <div className="lj-add">
          <h3 className="adm-settings-subheading">Add a job</h3>

          {/* ── Step 1: the main photo (required) ─────────────────────────── */}
          <div className="lj-step">
            <div className="lj-step-title">
              <span className="lj-step-num">1</span>
              <span>Job photo</span>
              <span className="lj-tag lj-tag--req">Required</span>
            </div>
            <p className="lj-step-help">
              The photo everyone sees. If your picture already shows the before &amp; after in
              one image, just add it here — you&rsquo;re done after this.
            </p>

            {beforePrev && (
              <Image src={beforePrev} alt="photo preview" width={560} height={300} className="lj-preview" />
            )}
            <div className="lj-pick">
              <button type="button" className="lj-pick-btn" onClick={() => beforeFileRef.current?.click()}>
                📷 Choose photo
              </button>
              <button type="button" className="lj-pick-btn" onClick={() => beforeCamRef.current?.click()}>
                📸 Take photo
              </button>
            </div>
            <input ref={beforeFileRef} type="file" accept="image/jpeg,image/png,image/webp"
              hidden onChange={e => pick('before', e.target.files?.[0])} />
            <input ref={beforeCamRef} type="file" accept="image/*" capture="environment"
              hidden onChange={e => pick('before', e.target.files?.[0])} />
          </div>

          {/* ── Step 2: optional "after" photo ────────────────────────────── */}
          <div className="lj-step lj-step--optional">
            <div className="lj-step-title">
              <span className="lj-step-num">2</span>
              <span>After photo</span>
              <span className="lj-tag lj-tag--opt">Optional — skip if unsure</span>
            </div>
            <p className="lj-step-help">
              Only add this if you have a <strong>second</strong> photo of the same spot taken
              afterward. It turns the two into a slide-to-compare effect. Most jobs don&rsquo;t need it.
            </p>

            {afterPrev && (
              <Image src={afterPrev} alt="after preview" width={560} height={300} className="lj-preview" />
            )}
            <div className="lj-pick">
              <button type="button" className="lj-pick-btn" onClick={() => afterFileRef.current?.click()}>
                📷 Choose photo
              </button>
              <button type="button" className="lj-pick-btn" onClick={() => afterCamRef.current?.click()}>
                📸 Take photo
              </button>
            </div>
            <input ref={afterFileRef} type="file" accept="image/jpeg,image/png,image/webp"
              hidden onChange={e => pick('after', e.target.files?.[0])} />
            <input ref={afterCamRef} type="file" accept="image/*" capture="environment"
              hidden onChange={e => pick('after', e.target.files?.[0])} />
          </div>

          {/* ── Caption ───────────────────────────────────────────────────── */}
          <div className="lj-step">
            <div className="lj-step-title">
              <span className="lj-step-num">3</span>
              <span>Caption</span>
              <span className="lj-tag lj-tag--opt">Optional</span>
            </div>
            <input className="adm-input" placeholder="e.g. Overgrown lot cleared · Conchas Lake"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {error && <p className="adm-error" style={{ marginTop: '.4rem' }}>{error}</p>}

          <button className="lj-submit" onClick={handleAdd} disabled={saving || !beforeFile}>
            {saving ? 'Uploading…' : 'Add to site'}
          </button>
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
                    {j.after_url ? (
                      <>
                        <Image src={j.before_url} alt="before" fill style={{ objectFit: 'cover', clipPath: 'inset(0 50% 0 0)' }} />
                        <Image src={j.after_url}  alt="after"  fill style={{ objectFit: 'cover', clipPath: 'inset(0 0 0 50%)' }} />
                      </>
                    ) : (
                      <Image src={j.before_url} alt="job" fill style={{ objectFit: 'cover' }} />
                    )}
                  </div>
                  <div className="craft-adm-body">
                    <div className="craft-adm-top">
                      <div>
                        <div className="craft-adm-name">{j.title || 'Untitled job'}</div>
                        <div className="craft-adm-slug">{j.after_url ? 'before / after slider' : 'single photo'}</div>
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
