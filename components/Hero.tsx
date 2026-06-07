import Image from 'next/image'

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <Image
        className="hero-photo"
        src="/hero-photo.jpg"
        alt="Riders on jet skis at Conchas Lake, New Mexico"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: '50% 46%' }}
      />
      <div className="hero-tint" />
      <div className="hero-grad" />

      <div className="shell hero-inner">
        <span className="eyebrow">Conchas Lake · New Mexico · Locally Run</span>
        <h1>
          On the <span className="w">water.</span>
          <br />
          On the <span className="e">job.</span>
        </h1>
        <p className="hero-sub">
          High-performance jet ski rentals and serious skid steer work — run by one local crew
          that knows Conchas Lake inside and out.
        </p>
        <div className="hero-cta">
          <a className="btn btn-water" href="#jetski">Rent a Jet Ski</a>
          <a className="btn btn-ghost" href="#skidsteer">Skid Steer Services</a>
        </div>
        <div className="hero-meta">
          <span>Gear <b>+</b> Guidance Included</span>
          <span>Call <b>(505) 573-9275</b></span>
          <span>TikTok <b>@pachecowatersports</b></span>
        </div>
      </div>
      <div className="shell">
        <div className="scroll-cue">Scroll ↓</div>
      </div>
    </section>
  )
}
