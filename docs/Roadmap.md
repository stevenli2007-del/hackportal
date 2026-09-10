# Roadmap — HackPortal (30-hour build)

Deadline **9/11 17:00 PST**. We assume ~30h available from 9/10 ~11:00 PDT and build a 6h sleep
block in. Submit by **16:30 PDT** to absorb any timezone/PST ambiguity. Each phase is one or more
**cards**; we finish a card, Steven reviews in VS Code, then the next card starts (see
`CodingRules.md`).

## Phases

| # | Phase | Est. | Cards | Outcome |
|---|---|---|---|---|
| 0 | Scaffold + first deploy | 1h | C0 | Repo, Supabase project, Vercel "hello world" live, `.env.example`, `proxy.ts` session refresh verified |
| 1 | Schema + RLS + seed | 2h | C1 | Migrations applied; `handle_new_user`, `is_organizer`, all policies; seed creates demo accounts + sample apps |
| 2 | Auth + roles + route guard | 2h | C2 | Sign up with track pick; sign in; `proxy.ts` protects `/apply`, `/dashboard`, `/organizer` |
| 3 | Applicant flow | 4h | C3–C5 | Form rendered from `form_fields`; save draft; submit; applicant dashboard w/ status timeline |
| 4 | Organizer flow | 4h | C6–C8 | Applications list + filters + computed avg score; detail + rubric grading; decision (status) |
| — | Sleep | 6h | — | — |
| 5 | Review Console (Creativity) | 3h | C9–C10 | Auto-assign reviewers; coverage tracker; decision board (kanban) |
| 6 | Design polish | 2h | C11 | Cal Hacks palette tokens; empty + error states; responsive |
| 7 | Deliver + docs | 1.5h | C12 | Deploy verify (Incognito), README, `// ?` sweep, English-comment pass |
| 8 | Video + submit | 2.5h | C13 | ≤3-min walkthrough (applicant → organizer → Review Console); fill submission form; short-question answers |

### GitHub repository (submission requirement)
The final submission requires a **public GitHub repository link**, so the repo is a first-class
deliverable, not an afterthought:
- **Created in C0**: `git init`, `gh repo create` (private→made public at submit, or public from the
  start), remote `origin` set, scaffold committed and **pushed**.
- **Per card**: each finished card is committed with a narrow-path `git add` and **pushed**, so the
  repo is always submission-ready and the grading video can be recorded against the live code.
- **Bud supplies the exact commands; Steven runs them locally** (git protocol is blocked in the
  sandbox, and our convention keeps pushes manual). Never `git add .`.
- **At submit (C13)**: confirm the repo is public and the default branch is current.

## Card detail (what each delivers)

- **C0 Scaffold:** `git init` + create the GitHub repo (remote `origin`) + first push; Next 16 app,
  TS, Tailwind v4, Supabase clients (from Tempo), Vercel project, `.env.example`, deploy a
  placeholder page. *Definition of Done:* Incognito load shows the page; `git log` shows the scaffold
  commit on `main`; remote `origin` is set. (Bud supplies the exact `git`/`gh` commands; **Steven runs
  them locally** — the sandbox blocks the git protocol, and our convention is that pushes are manual.)
- **C1 Schema:** `Database.md` §2–§4 as `.sql`; run in Supabase; `seed.sql` for demo data.
- **C2 Auth:** `lib/auth/actions.ts` sign-in/up (English error map), track select at signup,
  `proxy.ts` guards.
- **C3 Form render:** read `form_fields` for the user's track; controlled form; validation per ADR-1.
- **C4 Draft/submit:** Server Action `upsert` while `draft`; `submit` flips status, locks edits.
- **C5 Applicant dashboard:** own application status + 3-step timeline + avg score.
- **C6 List:** `application_overview` view; table with track/status/avg-score filters.
- **C7 Grade:** detail page renders responses + rubric; Server Action writes one `reviews` row.
- **C8 Decide:** accept/waitlist/reject buttons set `status`; `decided_at`.
- **C9 Assign+coverage:** on submit, insert N `assignments`; organizer dashboard shows coverage gaps.
- **C10 Board:** kanban columns by status; drag updates status; shows aggregated score.
- **C11 Polish:** design tokens, empty/error states, mobile.
- **C12 Deliver:** Incognito end-to-end test; README final; `// ?` resolved.
- **C13 Video+submit:** record, fill `forms.gle/t5SJQ2bUoKspCcv77`, attach short answers.
  *Video access check (submission requirement — easy to miss under deadline pressure):* the
  walkthrough video must be **public**, OR explicitly shared with **garysun@hackberkeley.org** and
  **eric_cao@hackberkeley.org**. Confirm access before submitting; a private video with no shares
  fails the criterion even if the link is pasted.

## Risk buffer
Phase 8 ends at 16:30 PDT; the final 30 min is buffer for Vercel hiccups. If a phase slips, cut
priority order: C11 polish < C9 coverage detail < C5 timeline. The end-to-end flow (C0–C8) is
non-negotiable.

## Definition of Done (whole project)
- Incognito: sign up as hacker → submit → log in as seeded organizer → grade → move a board card.
- README has demo accounts + local-run steps + `.env.example`.
- GitHub repo is **public** with all code pushed to the default branch (the submission link).
- Video ≤3 min covering applicant → organizer → Review Console.
- **Video access confirmed:** public, OR shared with `garysun@hackberkeley.org` and
  `eric_cao@hackberkeley.org` (a private video with no shares fails the criterion).
- Short-question answers submitted.
- Submitted by 16:30 PDT, 9/11.
