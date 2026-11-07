-- Word Detective cloud tables. Paste this whole file into Supabase: SQL Editor, New query, Run.
-- Every row belongs to the signed-in user (owner). Row-level security means nobody can read another user's rows.

create table if not exists public.children (
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id   text not null,                 -- the child's id on the device ("p1", ...)
  name       text not null default '',      -- first name only
  avatar     text not null default '',
  grade      int  not null default 2,
  progress   jsonb not null default '{}'::jsonb,
  active     jsonb not null default '{}'::jsonb,
  deleted    boolean not null default false, -- a "tombstone" so a deletion reaches other devices
  updated_at timestamptz not null default now(),
  primary key (owner, local_id)
);

create table if not exists public.custom_lessons (
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);

alter table public.children        enable row level security;
alter table public.custom_lessons  enable row level security;

drop policy if exists "own children" on public.children;
create policy "own children" on public.children
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "own lessons" on public.custom_lessons;
create policy "own lessons" on public.custom_lessons
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Signed-out visitors get nothing.
revoke all on public.children, public.custom_lessons from anon;
grant select, insert, update, delete on public.children, public.custom_lessons to authenticated;

-- Daily count of AI photo reads per user (written only by the read-assessment function).
create table if not exists public.ai_usage (
  owner uuid not null references auth.users (id) on delete cascade,
  day   date not null,
  count int  not null default 0,
  primary key (owner, day)
);
alter table public.ai_usage enable row level security; -- no policies: only the server function can touch it
revoke all on public.ai_usage from anon, authenticated;

-- Sharing: the owner lets a tutor (by email) READ their children's progress. Tutors can never change it.
create table if not exists public.shares (
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tutor_email text not null,
  created_at  timestamptz not null default now(),
  primary key (owner, tutor_email)
);
alter table public.shares enable row level security;

drop policy if exists "owner manages shares" on public.shares;
create policy "owner manages shares" on public.shares
  for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "tutor sees own shares" on public.shares;
create policy "tutor sees own shares" on public.shares
  for select to authenticated using (lower(tutor_email) = lower(auth.jwt() ->> 'email'));

-- Tutors read shared children (needs confirmed emails: keep "Confirm email" on in Supabase Auth settings).
drop policy if exists "tutor reads shared children" on public.children;
create policy "tutor reads shared children" on public.children
  for select to authenticated using (
    exists (select 1 from public.shares s
            where s.owner = children.owner and lower(s.tutor_email) = lower(auth.jwt() ->> 'email'))
  );

revoke all on public.shares from anon;
grant select, insert, update, delete on public.shares to authenticated;

-- Private bucket for assessment photos (only used when the family turns on photo sync).
-- Each user can only reach files under a folder named with their own user id.
insert into storage.buckets (id, name, public)
values ('assessment-photos', 'assessment-photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos select" on storage.objects;
create policy "own photos select" on storage.objects for select to authenticated
  using (bucket_id = 'assessment-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own photos insert" on storage.objects;
create policy "own photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'assessment-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects for update to authenticated
  using (bucket_id = 'assessment-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'assessment-photos' and (storage.foldername(name))[1] = auth.uid()::text);
