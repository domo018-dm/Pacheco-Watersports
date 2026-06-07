-- Stripe payment columns on reservations
alter table reservations
  add column if not exists stripe_session_id        text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_status           text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','failed'));

-- Unique index so the webhook can look up a reservation by session ID in O(1)
-- and the unique constraint prevents double-processing the same session.
create unique index if not exists reservations_stripe_session_idx
  on reservations (stripe_session_id)
  where stripe_session_id is not null;
