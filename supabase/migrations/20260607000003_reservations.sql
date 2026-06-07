-- ============================================================
-- reservations
-- ============================================================
create table reservations (
  id             uuid        primary key default gen_random_uuid(),
  craft_id       text        not null references crafts(id),
  customer_name  text        not null,
  customer_email text        not null,
  customer_phone text,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  status         text        not null default 'pending'
                               check (status in ('pending','confirmed','cancelled','completed')),
  notes          text,
  -- pending reservations expire after 30 min so unpaid holds don't block slots forever.
  -- stripe webhook sets status='confirmed' before expiry; admin can extend if needed.
  expires_at     timestamptz not null default (now() + interval '30 minutes'),
  created_at     timestamptz not null default now(),
  constraint reservations_time_order check (end_time > start_time)
);

-- Admin query patterns: by craft, by status, by date range (all supported via these indexes)
create index reservations_craft_status_start_idx
  on reservations (craft_id, status, start_time desc);

create index reservations_status_start_idx
  on reservations (status, start_time desc);

create index reservations_email_idx
  on reservations (customer_email);

-- Partial index for the hot availability query path (only live reservations)
create index reservations_availability_idx
  on reservations (craft_id, start_time, end_time)
  where status in ('pending','confirmed');

-- ============================================================
-- availability_blocks (admin blocks out dates — weather, maintenance, owner time off)
-- ============================================================
create table availability_blocks (
  id         uuid        primary key default gen_random_uuid(),
  craft_id   text        references crafts(id),  -- null = blocks ALL crafts (closed day)
  start_time timestamptz not null,
  end_time   timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  constraint availability_blocks_time_order check (end_time > start_time)
);

create index availability_blocks_overlap_idx
  on availability_blocks (craft_id, start_time, end_time);
