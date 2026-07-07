import Image from 'next/image'
import { createServerClient } from '@/lib/supabase/server'

// Pull the first active jet-ski photo from inventory so this section
// mirrors a real listing instead of showing an empty placeholder.
async function getJetSkiImage(): Promise<{ url: string; name: string } | null> {
  const { data } = await createServerClient()
    .from('crafts')
    .select('image_url, name')
    .eq('type', 'ski')
    .eq('active', true)
    .not('image_url', 'is', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.image_url ? { url: data.image_url, name: data.name } : null
}

export default async function JetSkiSection() {
  const photo = await getJetSkiImage()

  return (
    <section className="svc water-svc" id="jetski">
      <div className="shell">
        <div className="svc-grid">
          <div className="svc-body">
            <div className="svc-head">
              <div className="svc-num">01</div>
              <div className="tt">
                <span className="eyebrow">Hourly Rentals</span>
                <h2>
                  Jet Ski<br />Rentals
                </h2>
              </div>
            </div>
            <p className="tag">
              We&apos;ve got the gear and the guidance for an unforgettable water adventure.
            </p>

            <div className="specs">
              <div className="spec">
                <span className="n">IN</span>
                <div className="b">
                  <strong>High-performance skis</strong>
                  <span>Clean, fast, and ready when you are.</span>
                </div>
              </div>
              <div className="spec">
                <span className="n">IN</span>
                <div className="b">
                  <strong>Life jackets included</strong>
                  <span>Sized for everyone in your group — on us.</span>
                </div>
              </div>
              <div className="spec">
                <span className="n">IN</span>
                <div className="b">
                  <strong>Safety briefing included</strong>
                  <span>A quick, real walkthrough before you launch.</span>
                </div>
              </div>
              <div className="spec">
                <span className="n">$</span>
                <div className="b">
                  <strong>Booked by the hour</strong>
                  <span>Call to check the day&apos;s availability and rate.</span>
                </div>
              </div>
            </div>

            <div className="svc-cta">
              <a className="btn btn-water" href="tel:+15055739275">
                <span className="dot" style={{ background: 'var(--ink)' }} />
                Call to Book
              </a>
              <span className="note">(505) 573-9275 · Conchas Lake launch</span>
            </div>
          </div>

          <div className="svc-media">
            <div className="svc-photo">
              {photo ? (
                <Image
                  src={photo.url}
                  alt={`${photo.name} jet ski at Conchas Lake`}
                  fill
                  sizes="(max-width: 1000px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span style={{ opacity: 0.4 }}>Jet ski photo</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
