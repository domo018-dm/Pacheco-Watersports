const services = [
  { num: '01', label: 'Road\nRepair' },
  { num: '02', label: 'Land\nLeveling' },
  { num: '03', label: 'Lot\nClean-Ups' },
  { num: '04', label: '& More' },
]

export default function SkidSteerSection() {
  return (
    <section className="svc earth" id="skidsteer">
      <div className="shell">
        <div className="svc-grid flip">
          <div className="svc-body">
            <div className="svc-head">
              <div className="svc-num">02</div>
              <div className="tt">
                <span className="eyebrow" style={{ color: 'var(--clay)' }}>
                  Heavy Equipment
                </span>
                <h2>
                  Skid Steer<br />Services
                </h2>
              </div>
            </div>
            <p className="tag">
              Need dirt moved, ground leveled, or a lot cleared? Same crew, different machine —
              and the same care for getting it done right.
            </p>

            <div className="chips">
              {services.map(({ num, label }) => (
                <div className="chip" key={num}>
                  <span className="num">{num}</span>
                  <h4 style={{ whiteSpace: 'pre-line' }}>{label}</h4>
                </div>
              ))}
            </div>

            <div className="svc-cta">
              <a className="btn" href="tel:+15055739275">
                <span className="dot" />
                Get a Quote
              </a>
              <span className="note">Tell us the job — we&apos;ll tell you what it takes.</span>
            </div>
          </div>

          <div className="svc-media">
            <div className="svc-photo">
              <span style={{ opacity: 0.4 }}>Skid steer photo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
