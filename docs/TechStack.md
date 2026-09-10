# TechStack — HackPortal

## 1. Stack (matches the assignment's suggested production stack)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | The assignment lists Next.js; App Router gives us Server Components + Server Actions, which collapse most of the API surface into typed functions. |
| Language | **TypeScript** | Non-negotiable for a readable, reviewable submission. |
| UI | **React 19** + **Tailwind CSS v4** | Tailwind v4's CSS-first config keeps design tokens in one file; fast to keep branding consistent. |
| Backend / DB | **Supabase** (Postgres + Auth + RLS) | The assignment names Supabase; its RLS model lets us enforce "applicants see only their app, organizers see all" in the database, which is the cleanest answer to the multi-account-type requirement. |
| Hosting | **Vercel** | Zero-config Next.js deploy; matches the assignment's tooling. |

## 2. Reuse from Tempo (our existing project)
We are not starting from zero. The following from the Tempo codebase are reused nearly verbatim
(English comments added):
- `lib/supabase/{env,server,browser,admin,proxy}.ts` — cookie-based SSR auth clients + session
  refresh (`proxy.ts`, the Next 16 rename of `middleware.ts`).
- `lib/auth/actions.ts` + `components/auth/auth-form.tsx` — email/password sign-in / sign-up.
- The RLS + `handle_new_user` migration pattern (see `Database.md` §4).
- Design tokens / `cn()` util / `components/ui/button.tsx`.

**Deliberately NOT reused** (irrelevant to this task, would bloat the build): `mammoth`,
`pdfjs-dist`, `jszip`, `@base-ui/react`, the LLM/sync layers. A slim `package.json` is written in
the build phase.

## 3. Architecture at a glance
```
Browser ──▶ Next.js (App Router)
              ├─ Server Components  → read from Supabase (RLS-scoped)
              ├─ Server Actions     → mutations (submit app, grade, decide)
              ├─ Route Handlers      → only auth callback + seed
              └─ proxy.ts            → session refresh + route protection
                        ▲
                   Supabase Postgres (Auth + RLS enforces all access rules)
```

**Why Server Actions over a hand-rolled REST API:** the assignment rewards "organized and readable"
code. Server Actions keep the mutation logic co-located with the form, typed end-to-end, with no
boilerplate controllers. Route Handlers are used only where the framework requires them (the
Supabase auth callback, a seed endpoint for local dev).

## 4. Comment & documentation policy
- **All code, comments, and docs are in English** (interviewers read the repo directly).
- Per-line comments are **not required**; the code must be readable on its own. Comments are added
  only where a decision is non-obvious (e.g. the RLS recursion fix in `Database.md` §4).
- Non-obvious decisions live in `Decisions.md` (ADRs), not as scattered comments.
- Steven reviews code in **VS Code** using the extension set in `.vscode/extensions.json`; lines he
  does not understand are marked `// ?…` and resolved at the start of the next card.

## 5. Environment variables
| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | safe to expose (anon context) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | safe to expose; RLS is the real gate |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (admin client) | **never** prefixed `NEXT_PUBLIC`; only in Route Handlers / seed. Leaking this = full DB access. |

See `.env.example`.

## 6. Node / runtime notes
- Local dev uses the managed Node 22 runtime. `next dev` has known issues in some sandboxed
  environments; if it fails, `next build` + `next start` is the validated path (documented in
  `CodingRules.md` §troubleshooting).
- Supabase schema is applied via migration `.sql` files run in the Supabase SQL editor (no CLI
  dependency), so the schema is visible in the repo and reviewable.
