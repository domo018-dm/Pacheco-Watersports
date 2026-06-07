-- Grant table-level privileges so anon/authenticated roles can reach the tables.
-- RLS policies control which rows they see — these grants just let them knock on the door.

grant select           on table crafts   to anon, authenticated;
grant select, insert   on table bookings to anon, authenticated;
