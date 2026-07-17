-- TikTok videos the owner adds from the admin to showcase on the site.
-- Admins create/manage; anon reads active ones only. video_id is the numeric
-- TikTok id parsed from the pasted link; the public page embeds it via iframe.

create table tiktoks (
  id         uuid        primary key default gen_random_uuid(),
  video_id   text        not null,
  url        text        not null,
  caption    text,
  active     boolean     not null default true,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

alter table tiktoks enable row level security;

create policy "tiktoks_public_read"
  on tiktoks for select
  to anon, authenticated
  using (active = true);

create policy "tiktoks_admin_all"
  on tiktoks as permissive for all to authenticated
  using     (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

grant select                 on tiktoks to anon, authenticated;
grant insert, update, delete on tiktoks to authenticated;
grant all                    on tiktoks to service_role;
