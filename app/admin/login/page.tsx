'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthBrowserClient } from '@/lib/supabase/ssr'

const supabase = createAuthBrowserClient()

export default function AdminLoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/admin/reservations')
    router.refresh()
  }

  return (
    <div className="adm-login-wrap">
      <div className="adm-login-card">
        <p className="adm-login-brand">PACHECO WATERSPORTS</p>
        <h1 className="adm-login-head">Admin</h1>
        <p className="adm-login-sub">Conchas Lake Operations</p>

        <form onSubmit={handleSubmit} className="adm-form" style={{ marginTop: '1.8rem' }}>
          <div className="adm-field">
            <label className="adm-label">Email</label>
            <input
              type="email" className="adm-input"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus autoComplete="email"
            />
          </div>
          <div className="adm-field">
            <label className="adm-label">Password</label>
            <input
              type="password" className="adm-input"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
            />
          </div>
          {error && <p className="adm-error">{error}</p>}
          <button type="submit" className="adm-btn" disabled={loading} style={{ marginTop: '.4rem' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
