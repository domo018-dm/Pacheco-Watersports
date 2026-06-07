-- ⚠️ crafts schema v2
-- Adds total_units, hourly_rate, sort_order; renames photo_url → image_url;
-- tightens RLS so the public can only read active crafts (no public writes).

-- 1. New columns -----------------------------------------------------------
alter table crafts
  add column if not exists total_units integer      not null default 1,
  add column if not exists hourly_rate numeric(8,2),
  add column if not exists sort_order  integer      not null default 0;

-- 2. Rename photo_url → image_url (idempotent) -----------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'crafts' and column_name = 'photo_url'
  ) then
    alter table crafts rename column photo_url to image_url;
  end if;
end $$;

-- 3. Populate new columns on existing seed rows ----------------------------
update crafts set hourly_rate =  65.00, total_units = 2, sort_order = 1 where id = 'ski-thunder';
update crafts set hourly_rate =  65.00, total_units = 2, sort_order = 2 where id = 'ski-bolt';
update crafts set hourly_rate =  55.00, total_units = 1, sort_order = 3 where id = 'ski-rapid';
update crafts set hourly_rate =  65.00, total_units = 1, sort_order = 4 where id = 'ski-blaze';
update crafts set hourly_rate = 120.00, total_units = 1, sort_order = 5 where id = 'boat-mesa';
update crafts set hourly_rate =  95.00, total_units = 1, sort_order = 6 where id = 'boat-wake';

-- 4. Tighten RLS -----------------------------------------------------------
-- Drop the old open-read policy
drop policy if exists "Public can read crafts" on crafts;

-- Replace with active-only read (anon key can SELECT where active = true)
create policy "Public can read active crafts"
  on crafts for select
  using (active = true);

-- No explicit INSERT/UPDATE/DELETE policy → those ops require service_role,
-- which bypasses RLS. Pacheco manages the catalog via the Supabase dashboard.
