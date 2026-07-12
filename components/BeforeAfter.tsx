'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  before: string
  after:  string
  title?: string | null
  sizes?: string
}

// Drag-to-reveal before/after slider. A full-width transparent range input
// sits over the images, giving pointer drag AND keyboard control for free;
// the "before" image is revealed via clip-path driven by its value.
export default function BeforeAfter({ before, after, title, sizes = '(max-width: 1000px) 100vw, 50vw' }: Props) {
  const [pos, setPos] = useState(50)

  return (
    <figure className="ba-wrap">
      <div className="ba">
        {/* After = base layer */}
        <Image className="ba-img" src={after} alt={title ? `${title} — after` : 'After'} fill sizes={sizes} style={{ objectFit: 'cover' }} />
        {/* Before = clipped overlay */}
        <Image
          className="ba-img"
          src={before}
          alt={title ? `${title} — before` : 'Before'}
          fill
          sizes={sizes}
          style={{ objectFit: 'cover', clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />

        <span className="ba-tag ba-tag--before">Before</span>
        <span className="ba-tag ba-tag--after">After</span>

        <div className="ba-divider" style={{ left: `${pos}%` }} aria-hidden="true">
          <span className="ba-handle">‹ ›</span>
        </div>

        <input
          className="ba-range"
          type="range" min={0} max={100} value={pos}
          onChange={e => setPos(Number(e.target.value))}
          aria-label={title ? `${title}: reveal before and after` : 'Reveal before and after'}
        />
      </div>
      {title && <figcaption className="ba-title">{title}</figcaption>}
    </figure>
  )
}
