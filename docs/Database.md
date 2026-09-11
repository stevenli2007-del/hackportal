# Database — HackPortal

Postgres via Supabase. Schema is delivered as `.sql` migration files (run in the Supabase SQL
editor) so it is visible and reviewable in the repo. This document is the canonical model; the
migrations implement it exactly.

## 1. Enums
```sql
create type account_type as enum ('hacker','judge','mentor','volunteer','organizer');
create type app_status  as enum ('draft','submitted','under_review','accepted','waitlisted','rejected');
```

## 2. Tables

### 2.1 `profiles`
```
id           uuid  PK  (= auth.users.id)
display_name text
role         account_type  not null default 'hacker'
created_at   timestamptz   default now()
```
Created automatically on signup by the `handle_new_user()` trigger (§4). `role` starts as the track
chosen at signup; `organizer` is set only by seed SQL.

### 2.2 `applications`
```
id           uuid  PK
user_id      uuid  FK profiles(id)  unique   -- one application per user
type         account_type  not null  -- the track this application is for
status       app_status    not null default 'draft'
responses    jsonb         not null default '{}'::jsonb  -- track-specific answers, keyed by form_fields.key
submitted_at timestamptz
decided_at   timestamptz
created_at   timestamptz   default now()
```
`unique(user_id)` enforces "one application per person". `responses` holds track-specific fields so
we do not need a wide nullable column per track (see ADR-1).

### 2.3 `form_fields`  (drives form rendering + validation)
```
id        uuid  PK
type      account_type  not null   -- which track this question belongs to
key       text          not null    -- matches responses JSON key
label     text          not null
kind      text          not null    -- 'text' | 'textarea' | 'select' | 'email' | 'number'
options   jsonb          -- for select
required  boolean       not null default true
position  int           not null
unique(type, key)
```
This table is what makes "each account type has its own application" data-driven, and it is also
the hook for the Creativity feature (organizers could add a question without code changes).

### 2.4 `rubric_criteria`
```
id       uuid  PK
key      text  not null  unique
label    text  not null
weight   numeric not null default 1   -- relative weight in the total
max_score int not null default 5
position int not null
```
The weighted grading rubric. `total` on a review is a weighted average that stays on a 0–5
scale: each score is normalised to its own criterion (`score / max_score`), weighted, then
rescaled to 5 — `total = Σ((score_i / max_i) * weight_i) / Σ(weight_i) * 5`. With the seeded
rubric every `max_score` is 5, so this reduces to the plain weighted average used in `seed.sql`
(`(5*2 + 4*1 + 4*1) / 4 = 4.5`). Implemented in `lib/organizer/scoring.ts` (`weightedTotal`).

### 2.5 `reviews`
```
id            uuid  PK
application_id uuid FK applications(id)
reviewer_id    uuid FK profiles(id)
scores        jsonb not null   -- { criterion_key: score }
total         numeric           -- computed at write time
notes         text
created_at    timestamptz default now()
unique(application_id, reviewer_id)   -- one grade per organizer per application
```

### 2.6 `assignments`  (Review Console auto-distribution)
```
id            uuid  PK
application_id uuid FK applications(id)
reviewer_id    uuid FK profiles(id)
created_at    timestamptz default now()
unique(application_id, reviewer_id)
```
Records which organizers are assigned to grade which applications; the coverage tracker counts
assignments with a matching `reviews` row.

## 3. Reads the organizer needs
- **Applications list (F-5):** `applications` joined with `profiles` (display_name, type) and a
  computed average of `reviews.total` grouped by application. Implemented as a Postgres **view**
  `application_overview` to keep the query in one reviewed place.
  - **Security (migration `0003_view_security_invoker.sql`):** the view is declared
    `with (security_invoker = on)` so the base-table RLS applies to the **caller** — an organizer
    (`is_organizer()`) sees all rows; an applicant sees only their own. Without this, a view runs as
    its owner and bypasses RLS (Supabase linter 0010), leaking every application to any authenticated
    user through the REST API. The applicant dashboard does not read this view, so hardening it costs
    the applicant surface nothing.
- **Coverage (F-7):** applications where `count(reviews) < N` for their assignments.

## 4. Row Level Security (the critical part)
Enable RLS on every table. Policies:

| Table | Applicant (own) | Organizer |
|---|---|---|
| `profiles` | select/update own row | select all |
| `applications` | insert/update own row **only while `status='draft'`**; select own | select all; update `status` (decision) |
| `form_fields` | select (authenticated) | select all |
| `rubric_criteria` | select | select all |
| `reviews` | — (applicants never see reviews) | select all; insert/update own row |
| `assignments` | select own (reviewer) | select all |

**The recursion trap and its fix.** A naïve "organizer can read all profiles" policy would query
`profiles` to check `role = 'organizer'`, but that policy *is on `profiles`* → infinite recursion.
We avoid it with a `SECURITY DEFINER` helper that bypasses RLS:
```sql
create or replace function public.is_organizer() returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'organizer');
$$;
```
Policies reference `is_organizer()` instead of querying `profiles` directly. This is the single most
likely interview question about our data model — be ready to explain it.

**`handle_new_user()` trigger** (reused from Tempo): on `auth.users` insert, insert a `profiles` row
with `display_name` from metadata; `on conflict do nothing` for idempotency.

## 5. Seed strategy
An idempotent `seed.sql` (or a Route Handler `POST /api/seed` guarded by service role) creates:
- the demo organizer + demo hacker accounts (via Supabase Auth admin),
- a handful of submitted applications across tracks,
- a few `rubric_criteria` rows,
- some `reviews` + `assignments` so the organizer dashboard is not empty on first load.

Seeding writes only through the service-role client; never from the browser.

## 6. Why this shape (one-line summary)
Four tracks with distinct forms → `form_fields` config + `jsonb` responses (no nullable-column
explosion). Grading at scale → `reviews` + `assignments` + `rubric_criteria`. All access rules →
RLS with one `is_organizer()` helper. The model fits the problem instead of fighting it.
