-- Before/after land-clearing jobs for the Skid Steer Services section.
-- Admins create/manage; anon reads active ones only. Photos live in the
-- existing craft-images bucket under a land-jobs/ prefix.

create table land_jobs (
  id         uuid        primary key default gen_random_uuid(),
  title      text,
  before_url text        not null,
  after_url  text        not null,
  active     boolean     not null default true,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

alter table land_jobs enable row level security;

create policy "land_jobs_public_read"
  on land_jobs for select
  to anon, authenticated
  using (active = true);

create policy "land_jobs_admin_all"
  on land_jobs as permissive for all to authenticated
  using     (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

grant select                 on land_jobs to anon, authenticated;
grant insert, update, delete on land_jobs to authenticated;
grant all                    on land_jobs to service_role;
