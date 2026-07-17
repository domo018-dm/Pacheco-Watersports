import { createServerClient } from '@/lib/supabase/server'
import type { TikTok } from '@/types'

async function getTikToks(): Promise<TikTok[]> {
  const { data } = await createServerClient()
    .from('tiktoks')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as TikTok[]
}

export default async function TikTokSection() {
  const tiktoks = await getTikToks()
  if (tiktoks.length === 0) return null

  return (
    <section className="tk" id="tiktok">
      <div className="shell">
        <div className="fleet-head">
          <div>
            <span className="eyebrow">On TikTok</span>
            <h2>Watch us<br />in action.</h2>
          </div>
          <p className="tag">
            Jet skis, land clearing, and life at the lake — straight from the crew.
          </p>
        </div>

        <div className="tk-scroll">
          {tiktoks.map(t => (
            <div className="tk-card" key={t.id}>
              <iframe
                className="tk-frame"
                src={`https://www.tiktok.com/embed/v2/${t.video_id}`}
                title={t.caption ?? 'TikTok video'}
                loading="lazy"
                allow="encrypted-media; fullscreen"
                allowFullScreen
              />
              {t.caption && <p className="tk-cap">{t.caption}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
