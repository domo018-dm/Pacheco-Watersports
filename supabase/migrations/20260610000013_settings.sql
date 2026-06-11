-- Generic key/value settings table.
-- Only accessible by service role (bypasses RLS) — never exposed to client.
-- Used to store runtime Stripe config set via the admin panel.

create table settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;

-- No policies: authenticated/anon users cannot access this table at all.
-- Service role bypasses RLS and retains full access.
