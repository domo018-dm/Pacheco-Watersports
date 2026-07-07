'use client'

import { useState, useEffect, useCallback } from 'react'
import { submitReview } from '@/app/admin/actions'

export default function ReviewForm() {
  const [open,       setOpen]       = useState(false)
  const [author,     setAuthor]     = useState('')
  const [location,   setLocation]   = useState('')
  const [rating,     setRating]     = useState(5)
  const [hover,      setHover]      = useState(0)
  const [body,       setBody]       = useState('')
  const [hp,         setHp]         = useState('')   // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [done,       setDone]       = useState(false)

  const close = useCallback(() => setOpen(false), [])

  // Close on Escape; lock body scroll while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close])

  function openForm() {
    setAuthor(''); setLocation(''); setRating(5); setHover(0)
    setBody(''); setHp(''); setError(null); setDone(false)
    setOpen(true)
  }

  const canSubmit = author.trim().length >= 2 && body.trim().length >= 4 && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    const res = await submitReview({ author, location, body, rating, hp })
    setSubmitting(false)
    if ('error' in res && res.error) { setError(res.error); return }
    setDone(true)
  }

  return (
    <>
      <div className="reviews-cta">
        <button type="button" className="btn-reserve" onClick={openForm}>
          Write a review
        </button>
      </div>

      {open && (
        <div className="modal open" onClick={close} role="dialog" aria-modal="true">
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <button className="modal-x" type="button" onClick={close} aria-label="Close">×</button>

            <div className="modal-body">
              {done ? (
                <div style={{ padding: '.5rem 0 1rem' }}>
                  <p className="modal-eyebrow">Thank you</p>
                  <h3>Review submitted</h3>
                  <p className="modal-sub">
                    Thanks for the kind words! Your review will appear on the site once the
                    crew gives it a quick look.
                  </p>
                  <div className="modal-actions">
                    <button type="button" className="btn-confirm" onClick={close}>Done</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <p className="modal-eyebrow">Reviews</p>
                  <h3>Write a review</h3>
                  <p className="modal-sub">Tell other riders how your day on the water went.</p>

                  {/* Star rating */}
                  <div className="field-label" style={{ marginTop: '1.2rem' }}>Your rating</div>
                  <div className="review-star-input" role="radiogroup" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`review-star-btn${(hover || rating) >= n ? ' on' : ''}`}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                        aria-pressed={rating === n}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  {/* Name + location */}
                  <div className="field-label" style={{ marginTop: '1.2rem' }}>Your info</div>
                  <div className="modal-inputs">
                    <input
                      type="text" placeholder="Your name" value={author}
                      onChange={e => setAuthor(e.target.value)}
                      maxLength={60} autoComplete="name" required
                    />
                    <input
                      type="text" placeholder="Location (optional) — e.g. Albuquerque, NM"
                      value={location} onChange={e => setLocation(e.target.value)}
                      maxLength={80} autoComplete="off"
                    />
                  </div>

                  {/* Body */}
                  <div className="field-label" style={{ marginTop: '1.2rem' }}>Your review</div>
                  <textarea
                    className="review-textarea" rows={4}
                    placeholder="How was your rental? What did you ride?"
                    value={body} onChange={e => setBody(e.target.value)}
                    maxLength={1000} required
                  />

                  {/* Honeypot — off-screen; bots fill it, humans don't */}
                  <input
                    type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    value={hp} onChange={e => setHp(e.target.value)}
                    style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                  />

                  {error && <p role="alert" className="review-error">{error}</p>}

                  <div className="modal-actions">
                    <button type="submit" className="btn-confirm" disabled={!canSubmit}>
                      {submitting ? 'Submitting…' : 'Submit review'}
                    </button>
                    <p className="modal-call">Reviews are checked before they go live.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
