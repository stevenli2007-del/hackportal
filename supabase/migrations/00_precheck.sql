-- ============================================================================
-- HackPortal — Prereq check before 0001_init.sql
-- Confirms the `public` schema is empty (no leftover Tempo tables).
-- Expected: zero rows in the first query (or only Supabase-internal tables in
-- the second). If Tempo tables appear, drop them or use a clean project first.
-- ============================================================================

-- 1) Any user tables in public? (should be empty)
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- 2) Sanity: confirm the demo project identity (URL should contain tqehcmjhsqtkrevycvmp)
select current_database() as db, current_schema() as schema;
