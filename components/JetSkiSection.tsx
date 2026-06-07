export default function JetSkiSection() {
  return (
    <section className="svc water-svc" id="jetski">
      <div className="shell">
        <div className="svc-grid">
          <div className="svc-body">
            <div className="svc-head">
              <div className="svc-num">01</div>
              <div className="tt">
                <span className="eyebrow">Hourly Rentals</span>
                <h2>
                  Jet Ski<br />Rentals
                </h2>
              </div>
            </div>
            <p className="tag">
              We&apos;ve got the gear and the guidance for an unforgettable water adventure.
            </p>

            <div className="specs">
              <div className="spec">
                <span className="n">IN</span>
                <div className="b">
                  <strong>High-performance skis</strong>
                  <span>Clean, fast, and ready when you are.</span>
                </div>
              </div>
              <div className="spec">
                <span className="n">IN</span>
                <div className="b">
                  <strong>Life jackets included</strong>
                  <span>Sized for everyone in your group — on us.</span>
                </div>
              </div>
              <div className="spec">
                <span className="n">IN</span>
                <div className="b">
                  <strong>Safety briefing included</strong>
                  <span>A quick, real walkthrough before you launch.</span>
                </div>
              </div>
              <div className="spec">
                <span className="n">$</span>
                <div className="b">
                  <strong>Booked by the hour</strong>
                  <span>Call to check the day&apos;s availability and rate.</span>
                </div>
              </div>
            </div>

            <div className="svc-cta">
              <a className="btn btn-water" href="tel:+15055739275">
                <span className="dot" style={{ background: 'var(--ink)' }} />
                Call to Book
              </a>
              <span className="note">(505) 573-9275 · Conchas Lake launch</span>
            </div>
          </div>

          <div className="svc-media">
            <div className="svc-photo">
              <span style={{ opacity: 0.4 }}>Jet ski photo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
