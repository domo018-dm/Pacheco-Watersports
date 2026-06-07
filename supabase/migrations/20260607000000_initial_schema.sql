-- ⚠️ Initial schema: crafts + bookings

create table if not exists crafts (
  id            text primary key,                  -- e.g. 'ski-thunder'
  type          text not null check (type in ('ski', 'boat')),
  name          text not null,
  seats         int  not null,
  class_label   text not null,
  description   text not null,
  rate          text not null,
  photo_url     text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists bookings (
  id                       uuid primary key default gen_random_uuid(),
  craft_id                 text not null references crafts(id),
  customer_name            text not null,
  customer_phone           text not null,
  date                     date not null,
  time_slot                text not null,
  status                   text not null default 'pending'
                             check (status in ('pending', 'confirmed', 'cancelled')),
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now()
);

-- Prevent double-bookings: one craft per date+slot
create unique index if not exists bookings_craft_date_slot
  on bookings (craft_id, date, time_slot)
  where status != 'cancelled';

-- Seed the fleet
insert into crafts (id, type, name, seats, class_label, description, rate) values
  ('ski-thunder', 'ski',  'Thunder',       3,  'HP',     'High-performance', 'Hourly'),
  ('ski-bolt',    'ski',  'Bolt',          3,  'HP',     'High-performance', 'Hourly'),
  ('ski-rapid',   'ski',  'Rapid',         2,  'SPORT',  'Agile / quick',    'Hourly'),
  ('ski-blaze',   'ski',  'Blaze',         3,  'HP',     'High-performance', 'Hourly'),
  ('boat-mesa',   'boat', 'Mesa Pontoon',  10, 'CRUISE', 'Shade + cooler',   'Hourly · Half-day'),
  ('boat-wake',   'boat', 'Wake Runner',   6,  'SPORT',  'Tow-ready',        'Hourly · Half-day')
on conflict (id) do nothing;

-- Enable Row Level Security (open read for now; tighten when auth is added)
alter table crafts   enable row level security;
alter table bookings enable row level security;

create policy "Public can read crafts"
  on crafts for select using (true);

create policy "Public can insert bookings"
  on bookings for insert with check (true);

create policy "Public can read own bookings"
  on bookings for select using (true);
