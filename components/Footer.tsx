import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="foot">
      <div className="shell foot-grid">
        <div>
          <Image
            src="/logo.png"
            alt="Pacheco Watersports"
            height={96}
            width={96}
            style={{ height: '96px', width: 'auto', marginBottom: '1rem' }}
          />
          <p className="foot-fine">On the water. On the job. — Conchas Lake, NM</p>
          <a
            href="https://www.tiktok.com/@pachecowatersports"
            target="_blank"
            rel="noopener noreferrer"
            className="foot-tiktok"
          >
            TikTok · @pachecowatersports
          </a>
        </div>
        <nav className="foot-links" aria-label="Footer">
          <a href="#jetski">Jet Skis</a>
          <a href="#fleet">The Fleet</a>
          <a href="#skidsteer">Skid Steer</a>
          <a href="#local">Conchas Lake</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
