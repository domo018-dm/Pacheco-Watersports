-- service_role has BYPASS RLS (row-level security is skipped) but PostgreSQL
-- table-level GRANT privileges are enforced independently. Our server-side API
-- routes (checkout, webhook) use the service role client to UPDATE reservations —
-- without these grants the updates fail with "permission denied for table reservations".

GRANT ALL ON TABLE public.reservations        TO service_role;
GRANT ALL ON TABLE public.availability_blocks TO service_role;
GRANT ALL ON TABLE public.crafts              TO service_role;
