import { createServerClient } from '@/lib/supabase/server'

interface Review {
  id: string
  author: string
  location: string | null
  body: string
  rating: number
}

function Stars({ n }: { n: number }) {
  return (
    <span className="review-stars" aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

export default async function ReviewsSection() {
  const supabase = createServerClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, author, location, body, rating')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!reviews?.length) return null

  return (
    <section className="reviews" id="reviews">
      <div className="shell">
        <span className="eyebrow">Reviews</span>
        <h2 className="reviews-h2">Straight from<br />the lake.</h2>
        <div className="reviews-scroll">
          {reviews.map(r => (
            <article key={r.id} className="review-card">
              <div className="review-mark">&ldquo;</div>
              <p className="review-body">{r.body}</p>
              <Stars n={r.rating} />
              <p className="review-author">— {r.author}</p>
              {r.location && <p className="review-loc">{r.location}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
