import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { getStripe } from '@/lib/stripe'

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export const metadata = { title: 'Booking Confirmed — Pacheco Watersports' }

function hourLabel(iso: string) {
  const d = new Date(iso)
  const h = d.getHours()
  const ampm = h < 12 ? 'AM' : 'PM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${ampm}`
}

export default async function SuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams

  if (!session_id) redirect('/')

  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(session_id)
  } catch {
    redirect('/')
  }

  // Redirect to home if session wasn't paid (e.g. someone manually navigated to this URL)
  if (session.payment_status !== 'paid') redirect('/')

  const meta       = session.metadata ?? {}
  const refCode    = (meta.reservation_id ?? '').split('-')[0].toUpperCase() || '—'
  const craftName  = meta.craft_name    ?? '—'
  const custName   = meta.customer_name ?? ''
  const firstName  = custName.split(' ')[0] || 'there'
  const startTime  = meta.start_time
  const endTime    = meta.end_time
  const durHours   = meta.duration_hours ? Number(meta.duration_hours) : null

  const dateStr = startTime
    ? new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '—'
  const timeStr = startTime && endTime
    ? `${hourLabel(startTime)} – ${hourLabel(endTime)}`
    : '—'
  const amountStr = session.amount_total != null
    ? `$${(session.amount_total / 100).toFixed(2)}`
    : '—'

  return (
    <>
      <Nav />
      <main id="top">
        <section style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
          <div className="shell" style={{ maxWidth: 560 }}>

            <div style={{ fontSize: '3rem', color: 'var(--water)', marginBottom: '1.2rem', lineHeight: 1 }}>✓</div>

            <h1 style={{
              fontFamily: 'var(--ff-display)', fontSize: 'clamp(2rem,6vw,3.4rem)',
              lineHeight: 1.05, marginBottom: '.6rem', textTransform: 'uppercase',
            }}>
              You&apos;re on the water, {firstName}!
            </h1>

            <p style={{
              fontFamily: 'var(--ff-body)', fontSize: '1rem',
              color: 'oklch(0.85 0.015 85 / .65)', marginBottom: '2.5rem', maxWidth: 420,
            }}>
              Payment received. We&apos;ll call to confirm the details and meet you at the Conchas launch.
            </p>

            {/* Booking summary card */}
            <div style={{
              border: '1px solid oklch(0.85 0.015 85 / .14)',
              padding: '1.4rem 1.6rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              marginBottom: '2.5rem',
            }}>
              {[
                ['Ref #',    <span key="r" style={{ fontFamily: 'var(--ff-mono)', letterSpacing: '.14em', color: 'var(--amber)', fontSize: '1rem' }}>{refCode}</span>],
                ['Craft',    craftName],
                ['Date',     dateStr],
                ['Time',     timeStr],
                ...(durHours ? [['Duration', `${durHours} hr`] as [string, string]] : []),
                ['Paid',     amountStr],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1.5rem' }}>
                  <span style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '.68rem', letterSpacing: '.12em',
                    textTransform: 'uppercase', color: 'oklch(0.85 0.015 85 / .45)', flexShrink: 0,
                  }}>
                    {label}
                  </span>
                  <span style={{ fontFamily: 'var(--ff-body)', fontSize: '.95rem', textAlign: 'right' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <p style={{
              fontFamily: 'var(--ff-mono)', fontSize: '.74rem', letterSpacing: '.06em',
              color: 'oklch(0.85 0.015 85 / .5)', marginBottom: '2rem',
            }}>
              Questions? Call{' '}
              <a href="tel:+15055739275" style={{ color: 'var(--amber)' }}>(505) 573-9275</a>
              {' '}— we&apos;re at the lake.
            </p>

            <Link href="/" className="btn-reserve" style={{ display: 'inline-block' }}>
              Back to home
            </Link>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
