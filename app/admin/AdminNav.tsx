'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createAuthBrowserClient } from '@/lib/supabase/ssr-client'

const supabase = createAuthBrowserClient()

const NAV = [
  { href: '/admin/reservations', label: 'Reservations' },
  { href: '/admin/crafts',       label: 'Inventory'     },
  { href: '/admin/blocks',       label: 'Blocks'        },
  { href: '/admin/reviews',      label: 'Reviews'       },
  { href: '/admin/land-jobs',    label: 'Land Jobs'     },
  { href: '/admin/tiktoks',      label: 'TikToks'       },
  { href: '/admin/settings',     label: 'Settings'      },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  function close() { setOpen(false) }

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      <div className="adm-mobile-bar">
        <button
          className="adm-hamburger"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>
        <span className="adm-mobile-brand">PACHECO ADMIN</span>
      </div>

      {/* ── Backdrop (mobile only) ──────────────────────────────────── */}
      {open && (
        <div className="adm-overlay" onClick={close} aria-hidden="true" />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className={`adm-side${open ? ' open' : ''}`}>
        {/* Close button — only visible on mobile via CSS */}
        <button className="adm-side-close" onClick={close} aria-label="Close navigation">
          ×
        </button>

        <div className="adm-logo">
          <span>PACHECO</span>
          <span>ADMIN</span>
        </div>

        <nav className="adm-nav">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`adm-link${pathname.startsWith(href) ? ' active' : ''}`}
              onClick={close}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="adm-user">
          <p className="adm-user-email">{userEmail}</p>
          <button className="adm-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>
    </>
  )
}
