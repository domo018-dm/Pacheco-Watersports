import { createServerClient, createBrowserClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side client (Server Components, Server Actions, Route Handlers).
// Reads/writes the auth session from HTTP cookies.
export async function createAuthServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()    { return cookieStore.getAll() },
        setAll(cs)  {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {} // Server Components can't set cookies — middleware handles refresh
        },
      },
    }
  )
}

// Browser client (Client Components). Session is automatically synced via cookies.
// Call once at module level in 'use client' files — safe because the module only
// loads in the browser.
export function createAuthBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
