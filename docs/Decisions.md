# Decisions (ADRs) — HackPortal

Architectural decisions worth justifying in an interview. Each record: **Decision / Why / Trade-off**.
These are the "why not the other way" answers the panel will probe.

---

### ADR-1 — Track-specific answers as `form_fields` config + `jsonb`, not per-track tables
**Decision.** One `applications` table; track-specific questions live in `form_fields` and answers
in `applications.responses jsonb` keyed by `form_fields.key`.
**Why.** The assignment requires four distinct application forms. Per-track tables (hacker_details,
judge_details, …) are the "clean" normalized option but multiply tables and code 4× for the same
shape. A config table makes the form data-driven and doubles as the hook for the Creativity feature
(organizers can add a question without a migration).
**Trade-off.** `jsonb` is weaker on validation than typed columns. We mitigate by validating against
`form_fields` (required / kind / options) in the Server Action before write, and by always reading
through the config so the UI and storage agree.

### ADR-2 — `is_organizer()` as `SECURITY DEFINER` SQL function
**Decision.** Organizer checks in RLS use `public.is_organizer()` rather than querying `profiles`.
**Why.** A policy on `profiles` that checks `profiles.role` recurses into itself (RLS on the very
table being filtered). `SECURITY DEFINER` runs as the function owner, outside the caller's RLS, so
the check terminates. This is the canonical Supabase fix for the recursion trap.
**Trade-off.** None material; the function is tiny and read-only.

### ADR-3 — Server Actions, not a hand-rolled REST API
**Decision.** Mutations (submit, grade, decide) are Next.js Server Actions; Route Handlers exist
only for the Supabase auth callback and local seed.
**Why.** Server Actions co-locate form + mutation with end-to-end types and no controller boilerplate
— directly serves the "organized and readable" criterion. Fewer moving parts means fewer places for
the end-to-end flow to break (the Functionality criterion).
**Trade-off.** Server Actions are slightly less familiar than REST to some reviewers; we document the
boundary clearly so it is easy to follow.

### ADR-4 — Four tracks, hacker deep
**Decision.** Implement all four applicant types; hacker form is richest, the other three are 5–6
real questions.
**Why.** The assignment says "at least two". Four shows the data-driven form paying off, and depth on
hacker proves we thought about the primary user. Breadth-without-depth would read as padding.
**Trade-off.** More seed content; negligible code cost because forms are config-driven.

### ADR-5 — Creativity feature = Review Console (auto-assign + coverage + decision board)
**Decision.** The self-chosen feature targets the organizer's grading bottleneck, not a flashy add-on.
**Why.** The prompt opens with "tens of thousands of applications", which is fundamentally a grading-
at-scale problem. Auto-assignment + a coverage tracker make the bottleneck *visible and solvable*;
the decision board makes the outcome tangible and video-friendly. It reuses data the assignment
already requires (reviews, scores), so it is not bolted-on cruft.
**Trade-off.** We deliberately skip an applicant-side "wow" feature beyond the status timeline, betting
that judges care more about the daily organizer user.

### ADR-6 — Email confirmation disabled for the demo
**Decision.** Supabase email confirmation is turned off in the demo project so judges can sign up and
log in immediately.
**Why.** A judge hitting a "check your email" wall during a 3-minute evaluation kills the Functionality
score. The trade-off (weaker real-world auth hygiene) is acceptable for a take-home and is called out
in the README.
**Trade-off.** Not production-auth-realistic; documented as a deliberate demo choice.

### ADR-7 — Demo accounts are a deliverable, seeded not hardcoded
**Decision.** Seeded organizer + hacker accounts are created by an idempotent seed script and documented
in the README; credentials are never in source.
**Why.** Judges must reach the organizer side without us provisioning per-person accounts. Seeding (vs.
hardcoding in code) keeps secrets out of the repo and the data in the database like everything else.
**Trade-off.** Requires the seed step in setup; the README makes it one command.

### ADR-8 — English everywhere; comments only where non-obvious
**Decision.** Code, comments, and docs are English; per-line comments are not mandatory.
**Why.** Interviewers read the repo directly; the Structure criterion is about readable code, which we
achieve through naming + structure + ADRs, not comment density.
**Trade-off.** Less hand-holding in-code; mitigated by this file and `// ?` review markers.

### ADR-9 — Auto-assignment runs as a `SECURITY DEFINER` trigger, not application code
**Decision.** When an application reaches `status = 'submitted'`, a database trigger
(`assign_reviewers_on_submit`, migration `0004`) inserts the `assignments` rows — up to 2 organizers,
least loaded first.
**Why.** `submitApplication` executes in the **applicant's** session, and the only insert policy on
`assignments` is `assignments_organizer`, which requires `is_organizer()`. The applicant's own request
therefore can never write the rows that assign their reviewers: Postgres rejects the insert and the
feature fails silently (no error surfaces to the applicant). The alternatives are worse — calling the
admin client / service role from a user-facing mutation puts full-database credentials behind a public
form POST, and an RPC would have to be remembered and called from every future write path (seed, bulk
import, manual SQL fix). The trigger moves the privilege into the database and fires on *any*
transition into `submitted`, whichever code or operator caused it.
**Trade-off.** Business logic now lives in a migration, which is less discoverable than a TypeScript
function. Mitigated by keeping it small, commented, idempotent, and documented here and in
`Database.md` §2.6.
