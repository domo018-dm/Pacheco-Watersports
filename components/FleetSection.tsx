'use client'

import { useState } from 'react'
import type { Craft } from '@/types'

const FLEET: Craft[] = [
  { id: 'ski-thunder', type: 'ski', name: 'Thunder', seats: 3, classLabel: 'HP', desc: 'High-performance', rate: 'Hourly', availability: 'open' },
  { id: 'ski-bolt',    type: 'ski', name: 'Bolt',    seats: 3, classLabel: 'HP', desc: 'High-performance', rate: 'Hourly', availability: 'open' },
  { id: 'ski-rapid',   type: 'ski', name: 'Rapid',   seats: 2, classLabel: 'SPORT', desc: 'Agile / quick', rate: 'Hourly', availability: 'few' },
  { id: 'ski-blaze',   type: 'ski', name: 'Blaze',   seats: 3, classLabel: 'HP', desc: 'High-performance', rate: 'Hourly', availability: 'open' },
  { id: 'boat-mesa',   type: 'boat', name: 'Mesa Pontoon', seats: 10, classLabel: 'CRUISE', desc: 'Shade + cooler', rate: 'Hourly · Half-day', availability: 'open' },
  { id: 'boat-wake',   type: 'boat', name: 'Wake Runner',  seats: 6,  classLabel: 'SPORT',  desc: 'Tow-ready',     rate: 'Hourly · Half-day', availability: 'few' },
]

const AVAIL_LABEL: Record<string, string> = {
  open: 'Available today',
  few: 'Limited slots left',
  full: 'Fully booked',
}

type Filter = 'all' | 'ski' | 'boat'

export default function FleetSection() {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? FLEET : FLEET.filter((c) => c.type === filter)

  return (
    <section className="fleet" id="fleet">
      <div className="shell">
        <div className="fleet-head">
          <div>
            <span className="eyebrow">Today&apos;s Availability</span>
            <h2>The Fleet</h2>
          </div>
          <p className="tag">
            Every ski and boat comes ready to launch — life jackets and a safety briefing
            included. Pick your ride, grab an open hour, and we&apos;ll have it fueled and
            waiting at the Conchas launch.
          </p>
        </div>

        <div className="fleet-tabs" role="group" aria-label="Filter fleet">
          {(['all', 'ski', 'boat'] as Filter[]).map((f) => (
            <button
              key={f}
              className="fleet-tab"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Craft' : f === 'ski' ? 'Jet Skis' : 'Boats'}
            </button>
          ))}
        </div>

        <div className="fleet-grid">
          {visible.map((craft) => (
            <article className="craft" key={craft.id}>
              <div className="craft-media">
                <span className={`craft-type ${craft.type}`}>
                  {craft.type === 'ski' ? 'Jet Ski' : craft.classLabel === 'CRUISE' ? 'Pontoon' : 'Ski / Wake'}
                </span>
                <span style={{ opacity: 0.3, fontSize: '.7rem', fontFamily: 'var(--ff-mono)', letterSpacing: '.1em' }}>
                  Photo coming soon
                </span>
              </div>
              <div className="craft-body">
                <h3 className="craft-name">{craft.name}</h3>
                <div className="craft-specs">
                  <span>
                    {craft.type === 'ski' ? '' : 'Up to '}
                    <b>{craft.seats}</b>
                    {craft.type === 'ski' ? ' riders' : ''}
                  </span>
                  <span>{craft.desc}</span>
                  <span><b>{craft.classLabel}</b></span>
                </div>
                <div className={`avail ${craft.availability}`}>
                  <span className="dot" />
                  {AVAIL_LABEL[craft.availability]}
                </div>
                <div className="craft-foot">
                  <span className="craft-rate">{craft.rate}</span>
                  <button
                    className="btn-reserve"
                    disabled={craft.availability === 'full'}
                    onClick={() => window.location.href = `tel:+15055739275`}
                  >
                    Reserve
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p
          className="craft-rate"
          style={{ marginTop: '1.4rem', textAlign: 'center', opacity: .7 }}
        >
          Availability shown for today · Reserve online and we confirm by phone ·{' '}
          <a href="tel:+15055739275" style={{ color: 'var(--amber)' }}>(505) 573-9275</a>
        </p>
      </div>
    </section>
  )
}
