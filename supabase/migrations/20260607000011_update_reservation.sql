-- ============================================================
-- update_reservation
--
-- Admin-only: move an existing reservation to a new craft/time.
-- Uses the same concurrency pattern as create_reservation:
--   - SELECT … FOR UPDATE on the craft row serializes concurrent edits
--   - Block check identical to create_reservation
--   - Overlap count excludes the reservation being edited (AND id != p_reservation_id)
--     so the reservation doesn't compete against itself when staying on the same craft
--
-- Does NOT touch payment fields (amount_cents, payment_status, etc.).
-- Price differences are handled in-person; no charge on edit.
-- ============================================================
create or replace function update_reservation(
  p_reservation_id uuid,
  p_craft_id       text,
  p_start_time     timestamptz,
  p_end_time       timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_units  int;
  v_booked       int;
  v_available    int;
  v_blocked      boolean;
  v_old_status   text;
begin
  -- Basic sanity
  if p_end_time <= p_start_time then
    return json_build_object('error', 'invalid_time_range',
      'message', 'End time must be after start time.');
  end if;

  -- Verify the reservation exists and is in an editable state
  select status into v_old_status
  from reservations
  where id = p_reservation_id;

  if not found then
    return json_build_object('error', 'reservation_not_found',
      'message', 'Reservation not found.');
  end if;

  if v_old_status in ('cancelled', 'completed') then
    return json_build_object('error', 'reservation_not_editable',
      'message', 'Cancelled and completed reservations cannot be edited.');
  end if;

  -- Lock the target craft row — serializes concurrent edits to the same craft
  select total_units into v_total_units
  from crafts
  where id = p_craft_id and active = true
  for update;

  if not found then
    return json_build_object('error', 'craft_not_found',
      'message', 'That craft is not available.');
  end if;

  -- Check availability blocks (sitewide or craft-specific)
  select exists(
    select 1
    from availability_blocks
    where (craft_id = p_craft_id or craft_id is null)
      and start_time < p_end_time
      and end_time   > p_start_time
  ) into v_blocked;

  if v_blocked then
    return json_build_object('error', 'slot_blocked',
      'message', 'That time is blocked. Remove the block first if you need to move the booking there.');
  end if;

  -- Count overlapping live reservations, excluding this one.
  -- This is the critical difference from create_reservation: without the exclusion,
  -- editing a confirmed reservation to the same craft/time would always fail.
  select count(*) into v_booked
  from reservations
  where craft_id = p_craft_id
    and id != p_reservation_id
    and (
      status = 'confirmed'
      or (status = 'pending' and expires_at > now())
    )
    and start_time < p_end_time
    and end_time   > p_start_time;

  v_available := v_total_units - v_booked;

  if v_available <= 0 then
    return json_build_object('error', 'no_units_available',
      'message', 'That slot is fully booked. Choose a different time or craft.');
  end if;

  -- Apply the update — payment fields are intentionally untouched
  update reservations
  set craft_id   = p_craft_id,
      start_time = p_start_time,
      end_time   = p_end_time
  where id = p_reservation_id;

  return json_build_object(
    'id',              p_reservation_id,
    'units_remaining', v_available - 1
  );
end;
$$;

-- Authenticated (admin) users only — anon has no UPDATE on reservations
grant execute on function update_reservation to authenticated;
