-- 0002_applicant_submit.sql
--
-- Fixes a defect in 0001_init.sql's `applications_update_draft` policy.
--
-- The original policy pinned BOTH sides to draft:
--   using      (user_id = auth.uid() and status = 'draft')
--   with check (user_id = auth.uid() and status = 'draft')
-- `using` filters which rows may be touched (correct: only drafts are editable)
-- but `with check` validates the *resulting* row — so an applicant could never
-- move their own application draft -> submitted. Postgres rejects it with
--   ERROR 42501: new row violates row-level security policy for table "applications"
-- (reproduced against the live project on 2026-09-10 with an anon session).
--
-- Fix: keep `using` at status = 'draft' (a submitted application stays
-- immutable — that IS the "submit locks edits" guarantee, enforced in the
-- database rather than in the UI), but let the new row be either 'draft'
-- (save draft) or 'submitted' (submit). Nothing else changes: the organizer
-- decision path keeps its own `applications_organizer_update` policy (0001).

drop policy if exists applications_update_draft on applications;

create policy applications_update_own on applications
  for update
  using      (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and status in ('draft', 'submitted'));
