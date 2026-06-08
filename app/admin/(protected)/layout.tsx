import { redirect } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase/ssr'
import AdminNav from '@/app/admin/AdminNav'

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return (
      <div style={{ padding: '4rem 2rem', fontFamily: 'var(--ff-mono)', color: 'var(--clay)' }}>
        403 — not an admin account.
      </div>
    )
  }

  return (
    <div className="adm-shell">
      <AdminNav userEmail={user.email ?? ''} />
      <main className="adm-main">{children}</main>
    </div>
  )
}
