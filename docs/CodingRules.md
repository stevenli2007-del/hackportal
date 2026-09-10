# CodingRules — HackPortal

Adapted from the Tempo collaboration contract for this take-home. The goal here is stronger than
Tempo's: Steven must be able to **read and explain the code in an English interview**, not just
accept a product. The review loop is therefore "understand → explain", not just "verify".

## 1. Language
- **Everything in English**: code, comments, docs, commit messages, and the per-card delivery notes.
- Per-line comments are **not required**. Write code that is readable on its own. Add a comment only
  where a choice is non-obvious (e.g. the RLS recursion fix). Non-obvious decisions go in
  `Decisions.md` (ADRs), not as scattered comments.

## 2. VS Code review workflow (the core mechanism)
Extensions are pinned in `.vscode/extensions.json`. They exist to help Steven **read, dare to touch,
and self-diagnose** code — not to generate it (generation stays in the assistant).
- `xyz.local-history` — revert any edit without a commit.
- `yoavbls.pretty-ts-errors` — TS errors in plain English.
- `usernamehw.errorlens` — errors shown inline at the line.
- `aaron-bond.better-comments` — `// ?` review markers highlighted.
- `bradlc.vscode-tailwindcss` — hover a class to see the real style.

**`// ?` review markers.** When Steven does not understand a line, he writes above it:
`// ? why does this flip status here?` (Better Comments highlights it blue). At the **start of every
card**, the assistant greps `grep -rn "// ?" --include=*.ts --include=*.tsx` and answers each one in
chat before writing new code. No `// ?` left unresolved carries into a new card.

**Edit window (avoid clobbering).** Steven edits code only *after* a card is delivered and *before*
he accepts it. While the assistant is building a card, Steven does not edit the same files. The
assistant says "you can open it now" at delivery.

**Read-through after every card (the interview loop).** At delivery the assistant explicitly tells
Steven to **open the changed files in VS Code** and walks him through them: what each file does, the
non-obvious decision (mirrors "For Steven → Worth knowing"), and one likely interview question + answer
(see §4). This is not optional — the take-home is graded on Steven explaining the code line by line, so
understanding each card *before* the next starts is the whole point. Steven marks anything unclear with
`// ?` during this pass.

## 3. One card at a time
- Build is split into cards (see `Roadmap.md`). Finish one, Steven reviews, then start the next.
- **Stop points are the literal instruction.** A vague "continue" / "ok" after a Done report is
  *not* an order to start the next card — re-state the stop point ("finished C3, next is C4, start?")
  and wait for an explicit go.
- **No scope creep.** Do not fix unrelated things inside a card. Note them as candidates for a later
  card.

## 4. Per-card delivery ("For Steven")
Every card ends with a short English note (in chat, not committed to the repo):
```
## For Steven
Only look at these N files: <path> — <one line: what it adds>
The rest are mechanical; skip.
Worth knowing: <the counter-intuitive choice — why this, not the other>
How to verify: open <page> → click <x> → you should see <y>
Interview check: if they ask "<q>", answer "<a>"
```
Rules: name ≤2 files; "worth knowing" is only the non-obvious bit; "how to verify" is clickable;
"interview check" preps the walkthrough with one likely question + answer.

## 5. AI collaboration contract
- Do not guess requirements; ask.
- Do not expand beyond the card.
- Report honestly: if it is untested, say so. Never substitute "should be fine" for a real result.
- Mark anything unverifiable (third-party behavior) as "needs your test".
- Shell commands given to Steven: **never** inline Chinese `#` comments (the shell treats them as
  args). Put the explanation on its own line.

## 6. Forbidden
- Secrets in frontend / git / logs (`SUPABASE_SERVICE_ROLE_KEY` is server-only).
- A new frontend framework outside `TechStack.md`.
- Bypassing Supabase with another database.
- `git add .` blanket commits; narrow-path `git add` + phased commits.
- Per-line comment spam (see §1).

## 7. Troubleshooting (known environment quirks)
- `next dev` may fail under a sandboxed runtime (FS interception). Validated fallback: `next build`
  then `next start`. Document which path is used.
- Always call `supabase.auth.getUser()` (server-verified) in `proxy.ts`, never `getSession()`
  (local-only, forgeable). Keep `NextResponse.next({ request })` so refreshed cookies write back.
- Apply env reads (`getSupabaseEnv()`) **after** `cookies()` in server clients, or the build-time
  prerender mis-detects a static route and crashes on Vercel.
