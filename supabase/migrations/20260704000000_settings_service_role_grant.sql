-- The settings table (migration 20260610000013) was created AFTER the original
-- service_role grants (migration 20260607000008), so service_role never received
-- table-level privileges on it. The admin "Connect Stripe" flow writes Stripe keys
-- to this table via the service client and fails with:
--   "permission denied for table settings"
-- service_role bypasses RLS but PostgreSQL GRANTs are enforced independently.

GRANT ALL ON TABLE public.settings TO service_role;
