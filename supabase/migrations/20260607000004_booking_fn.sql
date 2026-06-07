-- ============================================================
-- check_availability
--
-- Returns available unit count for a craft in a time window.
-- Runs as SECURITY DEFINER so anon can call it without SELECT
-- on reservations (which would expose other customers' data).
--
-- Overlap test: two intervals [a,b) and [c,d) overlap iff a < d AND b > c.
-- "Blocked" means an availability_block exists for this craft (or sitewide, craft_id IS NULL).
-- Expired pending reservations (expires_at <= NOW()) are treated as vacant.
-- ============================================================
create or replace function check_availability(
  p_craft_id   text,
  p_start_time timestamptz,
  p_end_time   timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_units int;
  v_booked      int;
  v_blocked     boolean;
  v_available   int;
begin
  if p_end_time <= p_start_time then
    return json_build_object('error', 'invalid_time_range');
  end if;

  select total_units into v_total_units
  from crafts
  where id = p_craft_id and active = true;

  if not found then
    return json_build_object('error', 'craft_not_found');
  end if;

  -- Any block covering the window for this craft (or a sitewide block) → fully unavailable
  select exists(
    select 1
    from availability_blocks
    where (craft_id = p_craft_id or craft_id is null)
      and start_time < p_end_time
      and end_time   > p_start_time
  ) into v_blocked;

  if v_blocked then
    return json_build_object(
      'total',     v_total_units,
      'booked',    0,
      'available', 0,
      'blocked',   true
    );
  end if;

  -- Count live overlapping reservations:
  --   confirmed always count; pending only count while not yet expired
  select count(*) into v_booked
  from reservations
  where craft_id = p_craft_id
    and (
      status = 'confirmed'
      or (status = 'pending' and expires_at > now())
    )
    and start_time < p_end_time
    and end_time   > p_start_time;

  v_available := greatest(0, v_total_units - v_booked);

  return json_build_object(
    'total',     v_total_units,
    'booked',    v_booked,
    'available', v_available,
    'blocked',   false
  );
end;
$$;

-- ============================================================
-- create_reservation
--
-- Concurrency-safe booking: acquires a row-level lock on the
-- crafts row (SELECT … FOR UPDATE) so concurrent calls for the
-- same craft serialize.  The second caller re-counts after the
-- first commits and sees the updated booked count.
-- ============================================================
create or replace function create_reservation(
  p_craft_id       text,
  p_customer_name  text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time     timestamptz,
  p_end_time       timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_units int;
  v_booked      int;
  v_available   int;
  v_blocked     boolean;
  v_id          uuid;
begin
  -- Basic sanity
  if p_end_time <= p_start_time then
    return json_build_object('error', 'invalid_time_range',
      'message', 'End time must be after start time.');
  end if;

  if trim(p_customer_name) = '' or trim(p_customer_email) = '' then
    return json_build_object('error', 'missing_fields',
      'message', 'Name and email are required.');
  end if;

  -- Lock this craft's row. Every concurrent booking for craft X
  -- blocks here until the previous transaction commits.
  -- Different crafts do NOT block each other (row-level lock).
  select total_units into v_total_units
  from crafts
  where id = p_craft_id and active = true
  for update;

  if not found then
    return json_build_object('error', 'craft_not_found',
      'message', 'That craft is not available for booking.');
  end if;

  -- Re-check blocks now that we hold the lock
  select exists(
    select 1
    from availability_blocks
    where (craft_id = p_craft_id or craft_id is null)
      and start_time < p_end_time
      and end_time   > p_start_time
  ) into v_blocked;

  if v_blocked then
    return json_build_object('error', 'slot_blocked',
      'message', 'That time is not available for booking.');
  end if;

  -- Count live overlapping reservations (same expiry rule as check_availability)
  select count(*) into v_booked
  from reservations
  where craft_id = p_craft_id
    and (
      status = 'confirmed'
      or (status = 'pending' and expires_at > now())
    )
    and start_time < p_end_time
    and end_time   > p_start_time;

  v_available := v_total_units - v_booked;

  if v_available <= 0 then
    return json_build_object('error', 'no_units_available',
      'message', 'Sorry, that slot just filled up. Please pick a different time.');
  end if;

  -- Insert — expires_at defaults to now() + 30 min (set by column default)
  insert into reservations (
    craft_id, customer_name, customer_email, customer_phone,
    start_time, end_time
  )
  values (
    p_craft_id, trim(p_customer_name), trim(p_customer_email),
    nullif(trim(p_customer_phone), ''), p_start_time, p_end_time
  )
  returning id into v_id;

  return json_build_object(
    'id',              v_id,
    'status',          'pending',
    'units_remaining', v_available - 1
  );
end;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table reservations        enable row level security;
alter table availability_blocks enable row level security;

-- Customers can create a reservation; the function enforces all logic
create policy "anon_insert_reservations"
  on reservations for insert
  to anon, authenticated
  with check (true);

-- Availability blocks are public-readable (availability check needs them)
create policy "public_read_availability_blocks"
  on availability_blocks for select
  to anon, authenticated
  using (true);

-- ============================================================
-- Grants
-- ============================================================
grant execute on function check_availability   to anon, authenticated;
grant execute on function create_reservation   to anon, authenticated;
grant insert  on table   reservations          to anon, authenticated;
grant select  on table   availability_blocks   to anon, authenticated;
