'use client'

import { useState } from 'react'
import CraftCard from './CraftCard'
import type { Craft, CraftType } from '@/types'

type Filter = 'all' | CraftType

interface Props {
  crafts: Craft[]
}

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All Craft',
  ski: 'Jet Skis',
  boat: 'Boats',
}

export default function FleetGrid({ crafts }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const hasType = (t: CraftType) => crafts.some((c) => c.type === t)
  const visible = filter === 'all' ? crafts : crafts.filter((c) => c.type === filter)

  const filters: Filter[] = ['all', ...(hasType('ski') ? ['ski' as const] : []), ...(hasType('boat') ? ['boat' as const] : [])]

  return (
    <>
      {filters.length > 1 && (
        <div className="fleet-tabs" role="group" aria-label="Filter fleet">
          {filters.map((f) => (
            <button
              key={f}
              className="fleet-tab"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="fleet-empty-msg">No craft match this filter.</p>
      ) : (
        <div className="fleet-grid">
          {visible.map((craft) => (
            <CraftCard key={craft.id} craft={craft} />
          ))}
        </div>
      )}
    </>
  )
}
