# PRD — HackPortal (Cal Hacks FA26 Take-Home)

> Working title: **HackPortal**. Visual identity intentionally follows the Cal Hacks brand
> (Berkeley Blue + California Gold, bold large headings). Exact tokens are locked in the build
> phase. This document is the source of truth for *what* we build; `TechStack.md` covers *how*,
> `Roadmap.md` covers *when*, `Database.md` covers *data shape*, `Decisions.md` records *why*.

## 1. Context

Cal Hacks receives tens of thousands of applications per hackathon. This take-home asks for a
**miniature version of their management platform**: a portal where applicants sign in and submit
applications, and organizers review and grade them.

The assignment is intentionally open-ended. The four judging criteria are: **Functionality**
(end-to-end flow, auth, multiple account types), **Structure** (organized/readable code, data
shaped to the problem), **Design** (clean, intentional UX/branding), **Creativity** (the added
feature shows thought about real users).

**Core thesis:** the product is judged on a working end-to-end flow, not feature breadth. We build
a complete thin slice for every required surface, then go one level deep on the organizer pain
point that the "tens of thousands" line implies — grading bottlenecks.

## 2. Users & Personas

### 2.1 Applicant (four tracks)
The assignment requires "multiple account types, each with their own application (pick at least
two from: hacker, judge, mentor, volunteer)". We implement **all four**, each with a distinct form.
Depth is intentionally uneven: **hacker** is the richest form; judge / mentor / volunteer are
shorter (5–6 questions) but real.

| Track | Primary intent | Form emphasis |
|---|---|---|
| `hacker` | Builds at the event | Experience, skills, project ideas, team status, dietary/accessibility |
| `judge` | Evaluates projects | Domain expertise, judging availability, conflict-of-interest disclosure |
| `mentor` | Helps teams | Area of expertise, availability, mentoring style |
| `volunteer` | Runs logistics | Role interest, shifts, experience |

A user picks **one** track at signup and owns exactly **one** application for that track. Tracks
are driven by a `form_fields` config table (see `Database.md` §3), which is also what powers the
Creativity feature.

### 2.2 Organizer
The privileged reviewer role. Sees every application across all tracks, grades with a rubric, and
runs decisions. Organizers are **not** self-signup — they are created via seed SQL (a demo account
is provided so judges can experience this side). Organizer access is gated by `profiles.role =
'organizer'` enforced in RLS (see `Database.md` §4).

## 3. Required Features (mapped to assignment)

### 3.1 Applicant side
- **F-1 Sign in / sign up** backed by a real database (Supabase Auth). Email + password; email
  confirmation disabled for the demo so judges can register instantly.
- **F-2 Track selection** at signup (hacker / judge / mentor / volunteer).
- **F-3 Application form per track**, rendered from `form_fields`. Supports **save draft** and
  **submit**. Draft is editable; submitted is locked from edits by the applicant.
- **F-4 Applicant dashboard** showing the user's own application status and a short timeline
  (Applied → Under review → Decision). This is the cheap "one feature of your choosing" for the
  applicant side (see §4).

### 3.2 Organizer side
- **F-5 Applications list** — every application with its track, status, and (computed) average
  review score. Filterable by track and status. This is a hard requirement.
- **F-6 Application detail + grading** — view full responses, then grade with a weighted rubric
  (`rubric_criteria`). Each organizer grades an application at most once (`unique(application_id,
  reviewer_id)`).
- **F-7 Decision** — accept / waitlist / reject; recorded as `status` on the application.

### 3.3 Self-chosen feature — "Review Console" (Creativity)
We chose the organizer-facing pain point implied by "tens of thousands of applications": **grading
does not scale when every application funnels to the same few people.** The Review Console has
three parts:
- **Auto-assignment**: each submitted application is auto-distributed to N organizers (default 2),
  so no application is orphaned and no organizer is overloaded.
- **Coverage tracker**: a bar / list showing which applications have fewer than N completed
  reviews — the bottleneck is visible at a glance.
- **Decision board**: a kanban (Submitted / Accepted / Waitlisted / Rejected) with aggregated
  average score per card; drag to decide.

Rationale for picking this: it demonstrates thought about the *organizer* (the user who lives in
this portal daily), it is visible in a 3-minute video, and it reuses the same data the assignment
already requires (reviews + scores). It is not a toy feature bolted on for the rubric.

## 4. Applicant-side "extra" (F-4)
The status timeline is deliberately minimal: it reads `applications.status` and renders a 3-step
progress indicator plus the computed average score once reviews exist. Cost ≈ zero because the
state already exists; value is high because applicants otherwise have no feedback loop.

## 5. Demo accounts (implicit deliverable)
Judges must experience the organizer side without us creating accounts for them. We ship seeded
accounts documented in `README.md`:
- `organizer@demo.hackportal.dev` / `hackportal` — pre-loaded with several submitted applications
  across tracks, some already reviewed.
- `hacker@demo.hackportal.dev` / `hackportal` — a submitted hacker application (read-only view of
  own status).

These are created by an idempotent seed script run against the Supabase project, not hardcoded in
code.

## 6. Out of scope (explicit)
- Email/SMS notifications (status is shown in-app only).
- Real payment, QR check-in, or scheduling integrations.
- Multi-event support (one hackathon at a time).
- i18n, dark-mode toggle, analytics beyond the coverage tracker.

## 7. Acceptance criteria (per judging criterion)

| Criterion | How we prove it |
|---|---|
| Functionality | A judge, in an Incognito window, can sign up as a hacker, submit, then log in as the seeded organizer, grade, and move a card on the decision board — no dead ends. |
| Structure | `Database.md` models tracks as config + `jsonb` responses; RLS is centralized and uses a single `is_organizer()` helper; code is split by surface (auth / applicant / organizer / lib). |
| Design | Unified design tokens; Cal Hacks palette; every page has an empty state and an error state; no default-Tailwind sprawl. |
| Creativity | The Review Console addresses a stated scale problem and is the video's highlight. |

## 8. Open questions for Steven (pre-build)
1. Four tracks (hacker deep, others short) — confirm vs. two tracks only. *(Proposed: four.)*
2. Review Console as the single Creativity feature — confirm vs. a different pick. *(Proposed: yes.)*
3. Branding: follow Cal Hacks palette exactly — confirm vs. a distinct sub-brand. *(Proposed: follow.)*
