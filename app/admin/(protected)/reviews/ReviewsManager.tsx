'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReview, updateReview, deleteReview } from '@/app/admin/actions'

interface Review {
  id: string; author: string; location: string | null
  body: string; rating: number; active: boolean; sort_order: number
}

type FormState = {
  id?: string
  author: string; location: string; body: string
  rating: number; active: boolean; sort_order: number
}

const BLANK: FormState = { author: '', location: '', body: '', rating: 5, active: true, sort_order: 0 }

function Stars({ n }: { n: number }) {
  return <span className="rev-adm-stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

export default function ReviewsManager({ reviews }: { reviews: Review[] }) {
  const router = useRouter()
  const [form,    setForm]    = useState<FormState | null>(null)
  const [pending, setPending] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function openNew()       { setForm({ ...BLANK }); setError(null) }
  function openEdit(r: Review) {
    setForm({ id: r.id, author: r.author, location: r.location ?? '', body: r.body,
              rating: r.rating, active: r.active, sort_order: r.sort_order })
    setError(null)
  }
  function closeForm()     { setForm(null); setError(null) }

  function update(patch: Partial<FormState>) {
    setForm(f => f ? { ...f, ...patch } : f)
  }

  async function handleSubmit() {
    if (!form) return
    if (!form.author.trim() || !form.body.trim()) {
      setError('Author and review text are required.')
      return
    }
    setPending(true); setError(null)
    const data = {
      author:     form.author.trim(),
      location:   form.location.trim() || '',
      body:       form.body.trim(),
      rating:     form.rating,
      active:     form.active,
      sort_order: form.sort_order,
    }
    const result = form.id ? await updateReview(form.id, data) : await createReview(data)
    setPending(false)
    if (result.error) { setError(result.error); return }
    closeForm()
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this review? This cannot be undone.')) return
    const result = await deleteReview(id)
    if (result.error) { alert(result.error); return }
    router.refresh()
  }

  async function handleToggle(r: Review) {
    await updateReview(r.id, { active: !r.active })
    router.refresh()
  }

  return (
    <div>
      <div className="adm-topbar">
        <h1 className="adm-title">Reviews</h1>
        <button className="adm-btn adm-btn-sm" onClick={openNew}>+ New review</button>
      </div>

      <div className="adm-content">
        {reviews.length === 0 ? (
          <p className="adm-empty">No reviews yet. Add one to show testimonials on the site.</p>
        ) : (
          <div className="rev-adm-list">
            {reviews.map(r => (
              <div key={r.id} className="rev-adm-card">
                <div className="rev-adm-head">
                  <Stars n={r.rating} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span className={`badge badge-${r.active ? 'confirmed' : 'cancelled'}`}>
                      {r.active ? 'visible' : 'hidden'}
                    </span>
                    {r.sort_order !== 0 && (
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '.65rem', color: 'oklch(0.85 0.015 85 / .35)' }}>
                        #{r.sort_order}
                      </span>
                    )}
                  </div>
                </div>
                <p className="rev-adm-body">&ldquo;{r.body}&rdquo;</p>
                <p className="rev-adm-meta">
                  — {r.author}{r.location ? ` · ${r.location}` : ''}
                </p>
                <div className="adm-actions-row">
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openEdit(r)}>
                    Edit
                  </button>
                  <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => handleToggle(r)}>
                    {r.active ? 'Hide' : 'Show'}
                  </button>
                  <button className="adm-btn adm-btn-danger adm-btn-sm"
                    onClick={() => handleDelete(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit / New panel ─────────────────────────────────────────────────── */}
      {form && (
        <>
          <div className="adm-overlay" onClick={closeForm} aria-hidden="true" />
          <div className="adm-edit-panel" role="dialog" aria-label={form.id ? 'Edit review' : 'New review'}>

            <div className="adm-refund-head">
              <span className="adm-edit-title">{form.id ? 'Edit Review' : 'New Review'}</span>
              <button className="adm-side-close" onClick={closeForm} aria-label="Close">×</button>
            </div>

            <div className="adm-edit-grid" style={{ marginBottom: '.75rem' }}>
              <div className="adm-field">
                <label className="adm-label">Author *</label>
                <input type="text" className="adm-input" placeholder="Jane D."
                  value={form.author} onChange={e => update({ author: e.target.value })} />
              </div>
              <div className="adm-field">
                <label className="adm-label">Location <span style={{ fontWeight: 400, opacity: .5 }}>— optional</span></label>
                <input type="text" className="adm-input" placeholder="Albuquerque, NM"
                  value={form.location} onChange={e => update({ location: e.target.value })} />
              </div>
            </div>

            <div className="adm-field" style={{ marginBottom: '.75rem' }}>
              <label className="adm-label">Review *</label>
              <textarea className="adm-input adm-textarea" rows={4}
                placeholder="Write the review text here…"
                value={form.body} onChange={e => update({ body: e.target.value })} />
            </div>

            <div className="adm-edit-grid">
              <div className="adm-field">
                <label className="adm-label">Rating</label>
                <div className="adm-dur-pills">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button"
                      className={`adm-dur-pill${form.rating === n ? ' active' : ''}`}
                      onClick={() => update({ rating: n })}>
                      {'★'.repeat(n)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="adm-field">
                <label className="adm-label">Sort order</label>
                <input type="number" className="adm-input" min={0} step={1}
                  value={form.sort_order}
                  onChange={e => update({ sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="adm-field" style={{ marginTop: '.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active}
                  onChange={e => update({ active: e.target.checked })} />
                <span className="adm-label" style={{ margin: 0 }}>Visible on site</span>
              </label>
            </div>

            {error && <p className="adm-error" style={{ marginTop: '.75rem' }}>{error}</p>}

            <div className="adm-actions-row" style={{ marginTop: '1rem' }}>
              <button className="adm-btn" onClick={handleSubmit} disabled={pending}>
                {pending ? 'Saving…' : form.id ? 'Save changes' : 'Add review'}
              </button>
              <button className="adm-btn adm-btn-ghost" onClick={closeForm} disabled={pending}>
                Cancel
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
