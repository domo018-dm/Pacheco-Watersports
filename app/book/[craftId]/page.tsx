import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import BookingForm from '@/components/BookingForm'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Craft } from '@/types'

interface Props {
  params: Promise<{ craftId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { craftId } = await params
  return { title: `Reserve ${craftId} — Pacheco Watersports` }
}

export default async function BookPage({ params }: Props) {
  const { craftId } = await params

  const supabase = createServerClient()
  const { data } = await supabase
    .from('crafts')
    .select('*')
    .eq('id', craftId)
    .eq('active', true)
    .single()

  if (!data) notFound()

  const craft = data as Craft

  const hourlyRate = craft.hourly_rate ? `$${craft.hourly_rate.toFixed(0)}/hr` : craft.rate

  return (
    <>
      <Nav />
      <main id="top">
        <section style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>
          <div className="shell">
            <Link
              href="/#fleet"
              style={{
                fontFamily: 'var(--ff-mono)', fontSize: '.75rem', letterSpacing: '.1em',
                textTransform: 'uppercase', color: 'oklch(0.85 0.015 85 / .5)',
                textDecoration: 'none', display: 'inline-block', marginBottom: '2rem',
              }}
            >
              ← Back to fleet
            </Link>

            <div className="booking-header">
              <div>
                <span className="eyebrow">Reserve</span>
                <h1 className="booking-title">{craft.name}</h1>
                <p className="booking-subtitle">
                  {craft.seats} {craft.type === 'ski' ? 'riders' : `passenger${craft.seats > 1 ? 's' : ''}`}
                  &nbsp;·&nbsp;{craft.class_label}
                  &nbsp;·&nbsp;{hourlyRate}
                </p>
              </div>
            </div>

            <BookingForm craft={craft} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
