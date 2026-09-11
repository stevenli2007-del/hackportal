# HackPortal

A miniature hackathon application-management portal, built for the **Cal Hacks FA26 Tech Team
take-home**. Applicants sign in and submit track-specific applications; organizers review, grade
with a rubric, and run decisions on a live board.

> Brand: follows the Cal Hacks visual identity (Berkeley Blue + California Gold, bold headings).

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS) · Vercel

See [`docs/TechStack.md`](docs/TechStack.md) for rationale and [`docs/Database.md`](docs/Database.md)
for the data model.

## Features
- **Applicant side** — email/password sign-in; pick a track (hacker / judge / mentor / volunteer);
  fill a track-specific form (drafts + submit); view your own status + timeline.
- **Organizer side** — all applications with track, status, and average review score; filter;
  grade with a weighted rubric; accept / waitlist / reject.
- **Review Console (self-chosen feature)** — submitted applications are auto-assigned to reviewers;
  a coverage tracker shows grading bottlenecks; a decision board (kanban) aggregates scores and lets
  organizers drag applications to a decision.
- **Deployed** at a public URL: **https://hackportal-tempo-70da.vercel.app**

## Demo accounts
Created by the seed script (see Setup). Use these to experience both sides without signing up — the
seeded applications are spread across all four tracks, and deliberately only some are graded, so the
coverage tracker and decision board have something real to show:

| Role | Email | Password | Notes |
|---|---|---|---|
| Organizer | `organizer@demo.hackportal.dev` | `hackportal` | sees every application, grades, decides |
| Hacker | `hacker@demo.hackportal.dev` | `hackportal` | submitted application (read-only view) |
| Judge | `jamie.judge@demo.hackportal.dev` | `hackportal` | submitted |
| Mentor | `morgan.mentor@demo.hackportal.dev` | `hackportal` | submitted, left ungraded on purpose |
| Volunteer | `val.volunteer@demo.hackportal.dev` | `hackportal` | submitted, left ungraded on purpose |

> Email confirmation is disabled in the demo project so judges can sign up instantly. This is a
> deliberate demo choice, not production auth hygiene.

## Setup (local)
```bash
npm install
cp .env.example .env.local        # fill from your Supabase project
# apply migrations: run docs/../supabase/migrations/*.sql in the Supabase SQL editor
npm run dev                       # or: npm run build && npm start
```
Environment variables: see `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never
be prefixed `NEXT_PUBLIC`.

## Architecture
```
Browser → Next.js (Server Components read / Server Actions mutate / proxy.ts refreshes session)
                ↕  RLS-enforced
         Supabase Postgres (Auth + Row Level Security)
```
All access rules live in the database via RLS (one `is_organizer()` helper — see `Database.md` §4).

## Judging-criteria mapping
- **Functionality** — Incognito: sign up as hacker → submit → log in as organizer → grade → move a board card.
- **Structure** — tracks are config + `jsonb`; RLS centralized behind `is_organizer()`; code split by surface.
- **Design** — unified Cal Hacks tokens; every page has empty + error states.
- **Creativity** — the Review Console addresses the grading-at-scale problem implied by "tens of thousands of applications".

## Docs
`docs/PRD.md` · `docs/TechStack.md` · `docs/Database.md` · `docs/Decisions.md` · `docs/Roadmap.md` · `docs/CodingRules.md`

## Walkthrough video
_Link added on submission._
