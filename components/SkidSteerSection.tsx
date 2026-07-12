import { createServerClient } from '@/lib/supabase/server'
import BeforeAfter from './BeforeAfter'
import type { LandJob } from '@/types'

const services = [
  { num: '01', label: 'Road\nRepair' },
  { num: '02', label: 'Land\nLeveling' },
  { num: '03', label: 'Lot\nClean-Ups' },
  { num: '04', label: '& More' },
]

async function getLandJobs(): Promise<LandJob[]> {
  const { data } = await createServerClient()
    .from('land_jobs')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []) as LandJob[]
}

export default async function SkidSteerSection() {
  const jobs     = await getLandJobs()
  const featured = jobs[0]
  const rest     = jobs.slice(1)

  return (
    <section className="svc earth" id="skidsteer">
      <div className="shell">
        <div className="svc-grid flip">
          <div className="svc-body">
            <div className="svc-head">
              <div className="svc-num">02</div>
              <div className="tt">
                <span className="eyebrow" style={{ color: 'var(--clay)' }}>
                  Heavy Equipment
                </span>
                <h2>
                  Skid Steer<br />Services
                </h2>
              </div>
            </div>
            <p className="tag">
              Need dirt moved, ground leveled, or a lot cleared? Same crew, different machine —
              and the same care for getting it done right.
            </p>

            <div className="chips">
              {services.map(({ num, label }) => (
                <div className="chip" key={num}>
                  <span className="num">{num}</span>
                  <h4 style={{ whiteSpace: 'pre-line' }}>{label}</h4>
                </div>
              ))}
            </div>

            <div className="svc-cta">
              <a className="btn" href="tel:+15055739275">
                <span className="dot" />
                Get a Quote
              </a>
              <span className="note">Tell us the job — we&apos;ll tell you what it takes.</span>
            </div>
          </div>

          <div className="svc-media">
            {featured ? (
              <BeforeAfter before={featured.before_url} after={featured.after_url} title={featured.title} />
            ) : (
              <div className="svc-photo">
                <span style={{ opacity: 0.4 }}>Skid steer photo</span>
              </div>
            )}
          </div>
        </div>

        {rest.length > 0 && (
          <div className="ba-gallery">
            {rest.map(j => (
              <BeforeAfter key={j.id} before={j.before_url} after={j.after_url} title={j.title}
                sizes="(max-width: 760px) 100vw, 33vw" />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
