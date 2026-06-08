// Server-only — do NOT import this in client components.
// next/headers is a server-only module; bundling it in the browser will fail.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createAuthServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()   { return cookieStore.getAll() },
        setAll(cs) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {} // Server Components can't set cookies — middleware handles session refresh
        },
      },
    }
  )
}
