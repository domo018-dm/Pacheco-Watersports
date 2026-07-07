-- The payment_status check constraint (migration 20260607000007) only allowed
-- ('unpaid','paid','failed'). The refunds feature (migration 20260607000010) and
-- the charge.refunded webhook write 'refunded' / 'partially_refunded', which the
-- constraint rejects:
--   new row for relation "reservations" violates check constraint
--   "reservations_payment_status_check"
-- Widen the allowed set to include the refund statuses.

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_payment_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_payment_status_check
  CHECK (payment_status IN ('unpaid','paid','failed','refunded','partially_refunded'));
