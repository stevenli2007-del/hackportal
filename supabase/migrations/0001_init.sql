-- ============================================================================
-- HackPortal — Migration 0001: schema + RLS + triggers + view
-- Idempotent. Run in the Supabase SQL Editor (project tqehcmjhsqtkrevycvmp).
-- Prereq: confirm the `public` schema is empty first (see 00_precheck.sql).
-- ============================================================================

create extension if not exists pgcrypto;   -- crypt() / gen_salt() used by the seed

-- 1. Enums -------------------------------------------------------------------
do $$ begin
  create type account_type as enum
    ('hacker','judge','mentor','volunteer','organizer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_status as enum
    ('draft','submitted','under_review','accepted','waitlisted','rejected');
exception when duplicate_object then null; end $$;

-- 2. Tables ------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         account_type not null default 'hacker',
  created_at   timestamptz default now()
);

create table if not exists applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references profiles(id) on delete cascade,
  type         account_type not null,
  status       app_status not null default 'draft',
  responses    jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  decided_at   timestamptz,
  created_at   timestamptz default now()
);

create table if not exists form_fields (
  id       uuid primary key default gen_random_uuid(),
  type     account_type not null,
  key      text not null,
  label    text not null,
  kind     text not null check (kind in ('text','textarea','select','email','number')),
  options  jsonb,
  required boolean not null default true,
  position int not null,
  unique(type, key)
);

create table if not exists rubric_criteria (
  id        uuid primary key default gen_random_uuid(),
  key       text not null unique,
  label     text not null,
  weight    numeric not null default 1,
  max_score int not null default 5,
  position  int not null
);

create table if not exists reviews (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  reviewer_id    uuid not null references profiles(id) on delete cascade,
  scores         jsonb not null,
  total          numeric,
  notes          text,
  created_at     timestamptz default now(),
  unique(application_id, reviewer_id)
);

create table if not exists assignments (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  reviewer_id    uuid not null references profiles(id) on delete cascade,
  created_at     timestamptz default now(),
  unique(application_id, reviewer_id)
);

-- 3. Read view: application_overview (F-5 list + coverage) --------------------
create or replace view application_overview as
select
  a.id,
  a.user_id,
  p.display_name,
  a.type,
  a.status,
  a.submitted_at,
  a.decided_at,
  a.created_at,
  coalesce((select avg(r.total) from reviews r where r.application_id = a.id), 0) as avg_score,
  (select count(*) from assignments ag where ag.application_id = a.id) as assigned_count,
  (select count(*) from reviews rv where rv.application_id = a.id) as reviewed_count
from applications a
join profiles p on p.id = a.user_id;

-- 4. RLS ---------------------------------------------------------------------
alter table profiles         enable row level security;
alter table applications     enable row level security;
alter table form_fields      enable row level security;
alter table rubric_criteria  enable row level security;
alter table reviews          enable row level security;
alter table assignments      enable row level security;

-- 4a. is_organizer() — SECURITY DEFINER avoids the profiles recursion trap.
--     A policy ON profiles that queries profiles.role would recurse into itself;
--     running as the function owner bypasses the caller's RLS.
create or replace function public.is_organizer() returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'organizer'
  );
$$;

-- 4b. Policies (drop + create so re-running this file is safe) ---------------

-- profiles: read own row, or all if organizer; update own row only.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (id = auth.uid() or public.is_organizer());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- applications: applicant reads/edits own while draft; organizer reads all,
-- updates any (decision), and may set status.
drop policy if exists applications_select on applications;
create policy applications_select on applications
  for select using (user_id = auth.uid() or public.is_organizer());

drop policy if exists applications_insert on applications;
create policy applications_insert on applications
  for insert with check (user_id = auth.uid());

drop policy if exists applications_update_draft on applications;
create policy applications_update_draft on applications
  for update using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and status = 'draft');

drop policy if exists applications_organizer_update on applications;
create policy applications_organizer_update on applications
  for update using (public.is_organizer());

-- form_fields / rubric_criteria: readable by any authenticated user; organizer
-- has full write access (lets organizers add a question without a migration).
drop policy if exists form_fields_select on form_fields;
create policy form_fields_select on form_fields
  for select using (auth.uid() is not null);

drop policy if exists form_fields_organizer on form_fields;
create policy form_fields_organizer on form_fields
  for all using (public.is_organizer()) with check (public.is_organizer());

drop policy if exists rubric_select on rubric_criteria;
create policy rubric_select on rubric_criteria
  for select using (auth.uid() is not null);

drop policy if exists rubric_organizer on rubric_criteria;
create policy rubric_organizer on rubric_criteria
  for all using (public.is_organizer()) with check (public.is_organizer());

-- reviews: organizer-only. Applicants have no SELECT policy here -> denied.
drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews
  for select using (public.is_organizer());

drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews
  for insert with check (reviewer_id = auth.uid() and public.is_organizer());

drop policy if exists reviews_update on reviews;
create policy reviews_update on reviews
  for update using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

-- assignments: reviewer sees own; organizer full access.
drop policy if exists assignments_select on assignments;
create policy assignments_select on assignments
  for select using (reviewer_id = auth.uid() or public.is_organizer());

drop policy if exists assignments_organizer on assignments;
create policy assignments_organizer on assignments
  for all using (public.is_organizer()) with check (public.is_organizer());

-- 4c. handle_new_user() trigger (reused from Tempo). SECURITY DEFINER so the
--     insert into RLS-protected profiles succeeds. role comes from the track
--     passed at signup (raw_user_meta_data.track), defaulting to 'hacker'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    coalesce((new.raw_user_meta_data->>'track')::account_type, 'hacker')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
