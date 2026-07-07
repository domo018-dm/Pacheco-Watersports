import { ImageResponse } from 'next/og'
import { join } from 'node:path'
import sharp from 'sharp'

// Branded social share card (Facebook / iMessage / WhatsApp / X).
// 1200×630 is the size those platforms expect — supplying it fixes the
// faded/pixelated preview caused by FB upscaling the tiny site icon.
//
// The source hero photo is a *progressive* JPEG, which satori (next/og)
// can't decode, so we run both images through sharp to normalize them to
// baseline PNG (and pre-crop the hero to the exact card size).

export const runtime = 'nodejs'
export const alt = 'Pacheco Watersports — Jet Ski Rentals at Conchas Lake, NM'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const LOGO_W = 172

export default async function OpengraphImage() {
  const publicDir = join(process.cwd(), 'public')

  const [heroBuf, logoBuf] = await Promise.all([
    sharp(join(publicDir, 'hero-photo.jpg')).resize(1200, 630, { fit: 'cover' }).png().toBuffer(),
    sharp(join(publicDir, 'logo.png')).resize({ width: LOGO_W }).png().toBuffer(),
  ])
  const logoMeta = await sharp(logoBuf).metadata()
  const logoH = Math.round((logoMeta.height ?? 187) )

  const heroSrc = `data:image/png;base64,${heroBuf.toString('base64')}`
  const logoSrc = `data:image/png;base64,${logoBuf.toString('base64')}`

  return new ImageResponse(
    (
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
        {/* Full-bleed hero photo */}
        <img src={heroSrc} width={1200} height={630} alt="" style={{ objectFit: 'cover' }} />

        {/* Dark gradient for text legibility (satori needs explicit w/h — no `inset`) */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex',
            background:
              'linear-gradient(to top, rgba(6,16,26,0.96) 0%, rgba(6,16,26,0.85) 26%, rgba(6,16,26,0.4) 52%, rgba(6,16,26,0) 78%)',
          }}
        />

        {/* Logo + tagline, anchored bottom-left */}
        <div
          style={{
            position: 'absolute', left: 64, bottom: 56, right: 64,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}
        >
          <img src={logoSrc} width={LOGO_W} height={logoH} alt="" style={{ objectFit: 'contain' }} />
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: '#F5EFE2', letterSpacing: -1 }}>
            Jet Ski Rentals · Conchas Lake, NM
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#E9A23B', letterSpacing: 1 }}>
            (505) 573-9275 · On the water, on the job.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
