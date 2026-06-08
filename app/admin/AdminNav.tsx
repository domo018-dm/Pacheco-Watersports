'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createAuthBrowserClient } from '@/lib/supabase/ssr-client'

const supabase = createAuthBrowserClient()

const NAV = [
  { href: '/admin/reservations', label: 'Reservations' },
  { href: '/admin/crafts',       label: 'Crafts'        },
  { href: '/admin/blocks',       label: 'Blocks'        },
]

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="adm-side">
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
  )
}
