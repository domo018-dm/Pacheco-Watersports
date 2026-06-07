export default function ContactSection() {
  return (
    <section className="contact" id="contact">
      <div className="shell">
        <span className="eyebrow">Ready when you are</span>
        <h2>
          Let&apos;s get<br />you on it.
        </h2>
        <a className="phone-big" href="tel:+15055739275">
          (505) 573-9275
        </a>
        <div className="contact-row">
          <a className="btn btn-water" href="tel:+15055739275">
            <span className="dot" style={{ background: 'var(--ink)' }} />
            Call Now
          </a>
          <a
            className="btn btn-ghost"
            href="https://www.tiktok.com/@pachecowatersports"
            target="_blank"
            rel="noopener noreferrer"
          >
            Message on TikTok
          </a>
        </div>
        <div className="contact-meta">
          <span>Conchas Lake, New Mexico</span>
          <span>@pachecowatersports</span>
          <span>Jet Skis · Skid Steer</span>
        </div>
      </div>
    </section>
  )
}
