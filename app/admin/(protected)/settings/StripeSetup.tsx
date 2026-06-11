'use client'

import { useState, useTransition } from 'react'
import { connectStripe } from '@/app/admin/actions'

interface Props {
  accountName: string | null
  isLive: boolean | null
}

export default function StripeSetup({ accountName, isLive }: Props) {
  const [pk, setPk]           = useState('')
  const [sk, setSk]           = useState('')
  const [result, setResult]   = useState<{ ok?: string; error?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await connectStripe(pk.trim(), sk.trim())
      if ('error' in res) {
        setResult({ error: res.error })
      } else {
        setResult({ ok: res.accountName ?? 'Connected' })
        setPk('')
        setSk('')
      }
    })
  }

  return (
    <div className="adm-settings-card">
      {/* Current status */}
      <div className="adm-settings-status">
        {accountName ? (
          <>
            <span className="adm-settings-dot adm-settings-dot--on" />
            <span>
              Connected to <strong>{accountName}</strong>
              {isLive !== null && (
                <span className={`adm-settings-mode ${isLive ? 'adm-settings-mode--live' : 'adm-settings-mode--test'}`}>
                  {isLive ? 'LIVE' : 'TEST'}
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="adm-settings-dot adm-settings-dot--off" />
            <span>Stripe not connected — payments are disabled</span>
          </>
        )}
      </div>

      <hr className="adm-settings-divider" />

      <h3 className="adm-settings-subheading">Connect Stripe</h3>
      <p className="adm-settings-hint">
        Paste your Stripe API keys below. Find them at{' '}
        <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
          dashboard.stripe.com/apikeys
        </a>
        . The app will validate them and set up the payment webhook automatically.
      </p>

      <form onSubmit={submit} className="adm-settings-form">
        <label className="adm-settings-label">
          Publishable key
          <input
            type="text"
            value={pk}
            onChange={e => setPk(e.target.value)}
            placeholder="pk_live_..."
            autoComplete="off"
            spellCheck={false}
            required
            className="adm-settings-input"
          />
        </label>

        <label className="adm-settings-label">
          Secret key
          <input
            type="password"
            value={sk}
            onChange={e => setSk(e.target.value)}
            placeholder="sk_live_..."
            autoComplete="new-password"
            spellCheck={false}
            required
            className="adm-settings-input"
          />
        </label>

        {result?.error && (
          <p className="adm-settings-error">{result.error}</p>
        )}
        {result?.ok && (
          <p className="adm-settings-success">Connected to {result.ok}</p>
        )}

        <button type="submit" disabled={pending || !pk || !sk} className="adm-settings-btn">
          {pending ? 'Connecting…' : 'Connect Stripe'}
        </button>
      </form>

      <p className="adm-settings-fine">
        Keys are stored securely in the database. The webhook endpoint is created automatically
        — no Stripe dashboard configuration needed. To switch from test to live, simply paste
        your live keys and click Connect again.
      </p>
    </div>
  )
}
