-- Reviews for public testimonial display.
-- Admins create/manage; anon reads active ones only.

create table reviews (
  id         uuid        primary key default gen_random_uuid(),
  author     text        not null,
  location   text,
  body       text        not null,
  rating     int         not null default 5 check (rating between 1 and 5),
  active     boolean     not null default true,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "reviews_public_read"
  on reviews for select
  to anon, authenticated
  using (active = true);

create policy "reviews_admin_all"
  on reviews as permissive for all to authenticated
  using     (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check(exists (select 1 from profiles where id = auth.uid() and is_admin));

grant select                  on reviews to anon, authenticated;
grant insert, update, delete  on reviews to authenticated;
