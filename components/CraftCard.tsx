import Image from 'next/image'
import type { Craft } from '@/types'

interface Props {
  craft:      Craft
  onReserve?: (craft: Craft) => void
}

function typeLabel(craft: Craft): string {
  if (craft.type === 'ski') return 'Jet Ski'
  if (craft.type === 'other') return 'Other'
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

export default function CraftCard({ craft, onReserve }: Props) {
  return (
    <article className="craft">
      <div className="craft-media">
        <span className={`craft-type ${craft.type}`}>{typeLabel(craft)}</span>
        {craft.for_sale && <span className="craft-forsale">For Sale</span>}
        {craft.image_url ? (
          <Image
            src={craft.image_url}
            alt={craft.name}
            fill
            sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <span style={{
            opacity: 0.28, fontSize: '.68rem',
            fontFamily: 'var(--ff-mono)', letterSpacing: '.12em', textTransform: 'uppercase',
          }}>
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
            {craft.type === 'ski' ? ' riders' : craft.type === 'boat' ? ` passenger${craft.seats !== 1 ? 's' : ''}` : ''}
          </span>
          <span>{craft.description}</span>
          <span><b>{craft.class_label}</b></span>
        </div>

        {craft.for_sale && (
          <p className="craft-sale">
            For sale ·{' '}
            {craft.sale_price != null
              ? <b>${craft.sale_price.toLocaleString('en-US')}</b>
              : 'price on request'}
          </p>
        )}

        <div className="avail few">
          <span className="dot" />
          Call to check availability
        </div>

        <div className="craft-foot">
          <span className="craft-rate">{displayRate(craft)}</span>
          <button
            type="button"
            className="btn-reserve"
            onClick={() => onReserve?.(craft)}
          >
            Reserve
          </button>
        </div>

        {craft.for_sale && (
          <a
            className="btn-buy"
            href={`sms:+15055739275?&body=${encodeURIComponent(`Hi, I'm interested in buying the ${craft.name}. Is it still available and what's the asking price?`)}`}
          >
            Ask about buying
          </a>
        )}
      </div>
    </article>
  )
}
