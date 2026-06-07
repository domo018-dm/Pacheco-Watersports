const items = [
  'Jet Ski Rentals',
  'Skid Steer Services',
  'Safety Briefing Included',
  'Life Jackets On Us',
  'Local Operators',
]

export default function Strip() {
  return (
    <div className="strip" aria-hidden="true">
      <div className="marquee">
        {[...items, ...items].map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  )
}
