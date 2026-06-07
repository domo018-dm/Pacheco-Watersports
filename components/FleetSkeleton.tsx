const SKELETON_CARDS = [1, 2, 3]

function SkeletonBlock({ h, w = '100%', mb = 0 }: { h: string; w?: string; mb?: number }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        background: 'oklch(0.30 0.040 240)',
        borderRadius: 2,
        marginBottom: mb,
        flexShrink: 0,
      }}
    />
  )
}

export default function FleetSkeleton() {
  return (
    <section className="fleet" id="fleet" aria-busy="true" aria-label="Loading fleet">
      <div className="shell">
        <div className="fleet-head">
          <div>
            <span className="eyebrow">Today&apos;s Availability</span>
            <h2>The Fleet</h2>
          </div>
        </div>

        {/* tab placeholders */}
        <div className="fleet-tabs" style={{ pointerEvents: 'none' }}>
          {['All Craft', 'Jet Skis', 'Boats'].map((label) => (
            <div
              key={label}
              className="fleet-tab"
              style={{ opacity: 0.3, userSelect: 'none' }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="fleet-grid" style={{ marginTop: '1.6rem' }}>
          {SKELETON_CARDS.map((i) => (
            <div
              key={i}
              className="craft"
              style={{ opacity: 0.35, pointerEvents: 'none' }}
            >
              <div className="craft-media" />
              <div className="craft-body" style={{ gap: '.7rem' }}>
                <SkeletonBlock h="1.8rem" w="60%" mb={4} />
                <SkeletonBlock h=".9rem" w="80%" />
                <SkeletonBlock h=".9rem" w="45%" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <SkeletonBlock h=".9rem" w="30%" />
                  <SkeletonBlock h="2.2rem" w="28%" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
