-- Track cumulative refunded amount per reservation.
-- Set by webhook (charge.refunded) and optimistically by the admin refund action.
-- Using amount_refunded from the Stripe charge object ensures this is always
-- consistent with Stripe even if the webhook re-delivers.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS refunded_cents INTEGER NOT NULL DEFAULT 0;
