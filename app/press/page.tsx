import Image from 'next/image'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Press Kit — Pacheco Watersports',
  description: 'Brand assets, colors, typography, and boilerplate copy for Pacheco Watersports at Conchas Lake, NM.',
}

const COLORS = [
  {
    name: 'Ink',
    role: 'Primary background',
    oklch: 'oklch(0.19 0.032 240)',
    hex: '#161e2c',
    swatch: 'oklch(0.19 0.032 240)',
  },
  {
    name: 'Water',
    role: 'Brand blue · links · CTAs',
    oklch: 'oklch(0.72 0.115 228)',
    hex: '#3ab5e4',
    swatch: 'oklch(0.72 0.115 228)',
  },
  {
    name: 'Amber',
    role: 'Safety amber · accents',
    oklch: 'oklch(0.83 0.165 82)',
    hex: '#e8c23a',
    swatch: 'oklch(0.83 0.165 82)',
  },
  {
    name: 'Clay',
    role: 'Desert rust · alerts',
    oklch: 'oklch(0.63 0.135 46)',
    hex: '#c2603a',
    swatch: 'oklch(0.63 0.135 46)',
  },
  {
    name: 'Bone',
    role: 'Primary text · light surfaces',
    oklch: 'oklch(0.95 0.012 85)',
    hex: '#f4f0e7',
    swatch: 'oklch(0.95 0.012 85)',
  },
]

export default function PressKit() {
  return (
    <>
      <Nav />
      <main>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="pk-hero">
          <div className="shell">
            <span className="eyebrow">Brand assets</span>
            <h1 className="pk-title">Press Kit</h1>
            <p className="pk-sub">Pacheco Watersports · Conchas Lake, NM</p>
          </div>
        </section>

        {/* ── About ──────────────────────────────────────────────────────── */}
        <section className="pk-section">
          <div className="shell">
            <p className="pk-section-label">About</p>
            <p className="pk-body">
              Pacheco Watersports is a single-operator rental business at Conchas Lake, New Mexico.
              We offer high-performance jet ski rentals and professional skid steer services —
              serving locals, campers, and visitors who want to make the most of one of New
              Mexico&rsquo;s premier lakes.
            </p>
            <div className="pk-boilerplate">
              <p className="pk-boilerplate-label">Ready-to-use boilerplate</p>
              <p className="pk-boilerplate-text">
                Pacheco Watersports provides jet ski rentals and skid steer services at Conchas Lake,
                New Mexico. Book online or by phone. Open seasonally. For more information visit
                pachecowatersports.com or call (505)&nbsp;573&#8209;9275.
              </p>
            </div>
          </div>
        </section>

        {/* ── Logo ───────────────────────────────────────────────────────── */}
        <section className="pk-section">
          <div className="shell">
            <p className="pk-section-label">Logo</p>
            <div className="pk-logo-grid">
              <div className="pk-logo-card pk-logo-dark">
                <Image
                  src="/logo.png"
                  alt="Pacheco Watersports logo"
                  width={108}
                  height={108}
                  style={{ height: '108px', width: 'auto' }}
                />
                <p className="pk-logo-caption">Dark background (primary)</p>
                <a
                  href="/logo.png"
                  download="pacheco-watersports-logo.png"
                  className="pk-dl-btn"
                >
                  ↓ Download PNG
                </a>
              </div>
              <div className="pk-logo-card pk-logo-light">
                <Image
                  src="/logo.png"
                  alt="Pacheco Watersports logo"
                  width={108}
                  height={108}
                  style={{ height: '108px', width: 'auto' }}
                />
                <p className="pk-logo-caption" style={{ color: 'oklch(0.3 0.02 240 / .7)' }}>Light background</p>
                <a
                  href="/logo.png"
                  download="pacheco-watersports-logo.png"
                  className="pk-dl-btn pk-dl-btn-on-light"
                >
                  ↓ Download PNG
                </a>
              </div>
            </div>
            <p className="pk-note">
              Maintain clear space equal to the logo height on all sides.
              Do not recolor, stretch, rotate, or place over busy backgrounds.
            </p>
          </div>
        </section>

        {/* ── Colors ─────────────────────────────────────────────────────── */}
        <section className="pk-section">
          <div className="shell">
            <p className="pk-section-label">Brand Colors</p>
            <div className="pk-color-grid">
              {COLORS.map(c => (
                <div key={c.name} className="pk-swatch">
                  <div className="pk-swatch-block" style={{ background: c.swatch }} />
                  <p className="pk-swatch-name">{c.name}</p>
                  <p className="pk-swatch-role">{c.role}</p>
                  <p className="pk-swatch-hex">{c.hex}</p>
                  <p className="pk-swatch-oklch">{c.oklch}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Typography ─────────────────────────────────────────────────── */}
        <section className="pk-section">
          <div className="shell">
            <p className="pk-section-label">Typography</p>
            <div className="pk-type-stack">
              <div className="pk-type-row">
                <p className="pk-type-meta">Display · Anton · headlines, names, CTAs</p>
                <p className="pk-type-display">Pacheco Watersports</p>
              </div>
              <div className="pk-type-row">
                <p className="pk-type-meta">Mono · Space Mono · labels, badges, data</p>
                <p className="pk-type-mono">On the water. On the job.</p>
              </div>
              <div className="pk-type-row">
                <p className="pk-type-meta">Body · Archivo · paragraphs, descriptions</p>
                <p className="pk-type-body">
                  High-performance jet ski rentals and professional skid steer services
                  at Conchas Lake, New Mexico. One local crew, ready when you are.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Taglines ───────────────────────────────────────────────────── */}
        <section className="pk-section">
          <div className="shell">
            <p className="pk-section-label">Taglines</p>
            <p className="pk-note" style={{ marginBottom: '1rem' }}>Click any tagline to select it.</p>
            <ul className="pk-taglines">
              <li>&ldquo;On the water. On the job.&rdquo;</li>
              <li>&ldquo;Jet Ski Rentals &amp; Skid Steer Services · Conchas Lake, NM&rdquo;</li>
              <li>&ldquo;High-performance rentals at New Mexico&rsquo;s premier lake.&rdquo;</li>
              <li>&ldquo;One crew. Two machines. Conchas Lake, NM.&rdquo;</li>
            </ul>
          </div>
        </section>

        {/* ── Contact ────────────────────────────────────────────────────── */}
        <section className="pk-section" style={{ borderBottom: 'none', paddingBottom: '5rem' }}>
          <div className="shell">
            <p className="pk-section-label">Press Contact</p>
            <div className="pk-contact-grid">
              <div>
                <p className="pk-contact-label">Phone</p>
                <a href="tel:+15055739275" className="pk-contact-val">(505) 573-9275</a>
              </div>
              <div>
                <p className="pk-contact-label">Email</p>
                <a href="mailto:bookings@pachecowatersports.com" className="pk-contact-val">
                  bookings@pachecowatersports.com
                </a>
              </div>
              <div>
                <p className="pk-contact-label">TikTok</p>
                <a
                  href="https://www.tiktok.com/@pachecowatersports"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pk-contact-val"
                >
                  @pachecowatersports
                </a>
              </div>
              <div>
                <p className="pk-contact-label">Location</p>
                <p className="pk-contact-val">Conchas Lake, New Mexico</p>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
