-- 0004_auto_assign.sql
--
-- C9: auto-assign reviewers the moment an application is submitted.
--
-- Why this cannot live in the Server Action. `submitApplication`
-- (lib/application/actions.ts) writes through the APPLICANT's session, and the
-- only insert policy on `assignments` is `assignments_organizer`, which requires
-- `is_organizer()`. An applicant therefore cannot create the rows that assign
-- their own reviewers — the insert is rejected by RLS, silently from the app's
-- point of view. Doing it from the action would mean reaching for the service
-- role key inside a user-facing mutation.
--
-- A `SECURITY DEFINER` trigger moves the privilege into the database instead:
-- the function runs as its owner (which owns the tables, so RLS does not apply)
-- and fires on EVERY path that reaches status = 'submitted' — the UI, the seed,
-- or a manual SQL fix — not only the code path we happen to remember.
--
-- Idempotent: safe to re-run.
--
-- How reviewers are chosen: from `profiles where role = 'organizer'`, least
-- loaded first, capped at `target_reviewers`. With one organizer in the demo
-- database this assigns exactly one person per application; the "least loaded"
-- ordering is what keeps the distribution even once more organizers exist.
-- (Note: re-running seed.sql after this migration still yields the same
-- assignments — the seed's explicit inserts hit the same unique key and the
-- `on conflict do nothing` below makes the second insert a no-op.)

create or replace function public.assign_reviewers_on_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reviewers int := 2;  -- reviewers assigned per application
  already          int;
begin
  -- Only the transition INTO "submitted" distributes work. Everything else that
  -- touches this column — saveReview (submitted -> under_review) and
  -- decideApplication (-> accepted/waitlisted/rejected) — must not re-trigger a
  -- distribution, and a draft is not reviewable yet.
  if new.status <> 'submitted' then
    return new;
  end if;

  -- Written as a nested IF (not `tg_op = 'UPDATE' and old.status = ...`) because
  -- OLD is NULL on INSERT and PL/pgSQL does not promise left-to-right evaluation
  -- of AND, so a single expression could dereference a null record.
  if tg_op = 'UPDATE' then
    if old.status = 'submitted' then
      return new;
    end if;
  end if;

  -- Idempotent per application: a row that already has a review round never gets
  -- a second one, so a re-run or a manual UPDATE cannot double-assign.
  select count(*) into already from assignments where application_id = new.id;
  if already > 0 then
    return new;
  end if;

  insert into assignments (application_id, reviewer_id)
  select new.id, p.id
  from profiles p
  where p.role = 'organizer'
  order by
    (select count(*) from assignments a where a.reviewer_id = p.id),
    p.created_at
  limit target_reviewers
  on conflict (application_id, reviewer_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_application_submitted on applications;

create trigger on_application_submitted
  after insert or update of status on applications
  for each row execute function public.assign_reviewers_on_submit();

-- Verify (run manually, one statement at a time — the SQL editor only shows the
-- last result set):
--   select id, status,
--          (select count(*) from assignments ag where ag.application_id = a.id) as assigned,
--          (select count(*) from reviews rv where rv.application_id = a.id) as reviewed
--   from applications a order by created_at;
--
-- Expect the seeded gaps to survive: the 4 demo applications were assigned by
-- seed.sql before this migration existed, so they are untouched, and Morgan
-- Mentor / Val Volunteer still show reviewed = 0 — that gap is the C9/C10 demo.
