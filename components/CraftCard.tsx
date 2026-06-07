import Image from 'next/image'
import Link from 'next/link'
import type { Craft } from '@/types'

interface Props {
  craft: Craft
}

function typeLabel(craft: Craft): string {
  if (craft.type === 'ski') return 'Jet Ski'
  if (craft.class_label === 'CRUISE') return 'Pontoon'
  return 'Ski / Wake'
}

function displayRate(craft: Craft): string {
  if (craft.hourly_rate) {
    const base = `$${craft.hourly_rate.toFixed(0)}/hr`
    return craft.class_label === 'CRUISE' ? `${base} · Half-day avail.` : base
  }
  return craft.rate
}

export default function CraftCard({ craft }: Props) {
  return (
    <article className="craft">
      <div className="craft-media">
        <span className={`craft-type ${craft.type}`}>{typeLabel(craft)}</span>
        {craft.image_url ? (
          <Image
            src={craft.image_url}
            alt={craft.name}
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              opacity: 0.28,
              fontSize: '.68rem',
              fontFamily: 'var(--ff-mono)',
              letterSpacing: '.12em',
              textTransform: 'uppercase',
            }}
          >
            Photo coming soon
          </span>
        )}
      </div>

      <div className="craft-body">
        <h3 className="craft-name">{craft.name}</h3>

        <div className="craft-specs">
          <span>
            {craft.type === 'boat' ? 'Up to ' : ''}
            <b>{craft.seats}</b>
            {craft.type === 'ski' ? ' riders' : ''}
          </span>
          <span>{craft.description}</span>
          <span><b>{craft.class_label}</b></span>
        </div>

        {/* Availability is calculated dynamically once booking data exists */}
        <div className="avail few">
          <span className="dot" />
          Call to check availability
        </div>

        <div className="craft-foot">
          <span className="craft-rate">{displayRate(craft)}</span>
          <Link className="btn-reserve" href={`/book/${craft.id}`}>
            Reserve
          </Link>
        </div>
      </div>
    </article>
  )
}
