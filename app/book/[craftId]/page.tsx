// TODO: Booking flow for a specific craft
// - Show craft details
// - Date + time slot picker (query Supabase for availability)
// - Customer info form
// - Stripe payment (create PaymentIntent via /api/bookings)
// - Confirmation screen

interface Props {
  params: Promise<{ craftId: string }>
}

export default async function BookPage({ params }: Props) {
  const { craftId } = await params
  return (
    <main style={{ padding: '8rem 2rem', fontFamily: 'var(--ff-mono)', color: 'var(--bone)' }}>
      <p>Booking flow for <strong>{craftId}</strong> — coming soon.</p>
    </main>
  )
}
