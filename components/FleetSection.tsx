import { createServerClient } from '@/lib/supabase/server'
import FleetGrid from './FleetGrid'
import type { Craft } from '@/types'

async function getCrafts(): Promise<Craft[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('crafts')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[FleetSection] Supabase error:', error.message)
    return []
  }
  return (data ?? []) as Craft[]
}

export default async function FleetSection() {
  const crafts = await getCrafts()

  return (
    <section className="fleet" id="fleet">
      <div className="shell">
        <div className="fleet-head">
          <div>
            <span className="eyebrow">Today&apos;s Availability</span>
            <h2>The Fleet</h2>
          </div>
          <p className="tag">
            Every ski and boat comes ready to launch — life jackets and a safety
            briefing included. Pick your ride, grab an open hour, and we&apos;ll
            have it fueled and waiting at the Conchas launch.
          </p>
        </div>

        {crafts.length === 0 ? (
          <p
            className="craft-rate"
            style={{ textAlign: 'center', opacity: 0.7, margin: '3rem 0' }}
          >
            Fleet details coming soon — call{' '}
            <a href="tel:+15055739275" style={{ color: 'var(--amber)' }}>
              (505) 573-9275
            </a>
          </p>
        ) : (
          <FleetGrid crafts={crafts} />
        )}

        <p
          className="craft-rate"
          style={{ marginTop: '1.4rem', textAlign: 'center', opacity: 0.7 }}
        >
          Reserve online and we confirm by phone ·{' '}
          <a href="tel:+15055739275" style={{ color: 'var(--amber)' }}>
            (505) 573-9275
          </a>
        </p>
      </div>
    </section>
  )
}
