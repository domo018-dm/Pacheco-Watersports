// Browser-only — safe to import in client components.
// No next/headers import; session is synced automatically via cookies.
import { createBrowserClient } from '@supabase/ssr'

export function createAuthBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
