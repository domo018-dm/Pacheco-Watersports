'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
      <div className="shell">
        <a className="brand" href="#top" aria-label="Pacheco Watersports home">
          <Image
            className="brand-mark"
            src="/brand-mark.png"
            alt="Pacheco Watersports"
            width={42}
            height={42}
          />
          <span className="brand-name">
            <i>Pacheco</i>
            <b>Watersports</b>
          </span>
        </a>

        <nav className="nav-links" aria-label="Primary">
          <a href="#jetski">Jet Skis</a>
          <a href="#fleet">The Fleet</a>
          <a href="#skidsteer">Skid Steer</a>
          <a href="#local">Conchas Lake</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="btn nav-call" href="tel:+15055739275">
          <span className="dot" />
          <span className="num">(505) 573-9275</span>
        </a>
      </div>
    </header>
  )
}
