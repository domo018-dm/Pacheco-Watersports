import { createAuthServerClient } from '@/lib/supabase/ssr-server'
import ReviewsManager from './ReviewsManager'

export const metadata = { title: 'Reviews — Pacheco Admin' }

export default async function ReviewsPage() {
  const supabase = await createAuthServerClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return <ReviewsManager reviews={reviews ?? []} />
}
