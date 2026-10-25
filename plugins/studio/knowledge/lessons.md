# Plugin lessons

Base lessons, shipped with each version of the plugin. The agent only **reads** them; the lessons each user gains from experience go into the personal lessons, saved automatically by the retro.
Each build applies the **General** part and only the **Stack** sections for the project's technologies.
One actionable line each. Update instead of duplicating; delete what is no longer true.

# General

## Spec and plan

- Rate limits, quotas and other "check-then-act" logic around an `await` need an acceptance criterion with concurrent requests (`Promise.all`), not only sequential ones: the sequential tests pass and the race only shows up in review. (source: [[financas-pessoais]], 2026-10-24)

## Model routing

## Implementation

## Review and verification

- Test runners with automatic discovery (`node --test`, pytest, jest…) also pick up the tests of other branches in `.claude/worktrees/`: point the verification command at the project's test folders or exclude `.claude/`. (source: [[eval-001-slugify]], 2026-10-23)
- Auditors, verifiers and reviewers never read, or request over HTTP, the user's real data folder (e.g. `data/`): say so in the prompt of every lens and reproduce on a minimal copy with fake data. (source: [[audit-dashboard]], 2026-10-24)

# Stack

<!-- One section per technology, created when the first lesson appears: "## Stack: node", "## Stack: python", "## Stack: react"… -->

## Stack: node

- Each implementer worktree needs its own `npm ci` (on Windows, ~5 min): instruct it to run in the foreground with a long timeout and never to repeat it midway (repeating in parallel gives ENOTEMPTY and a corrupted `node_modules`). (source: [[financas-pessoais]], 2026-10-24)

## Stack: react

- Tests with Testing Library: use `user.paste` for text (not `user.type` key by key); with agents in parallel, key-by-key form tests go past 5 s and verify becomes flaky. (source: [[financas-pessoais]], 2026-10-24)

## Stack: vitest

- From the skeleton on, set `testTimeout` and `hookTimeout` (≥ 15–30 s) in `vitest.config`: raising only `testTimeout` leaves heavy `beforeEach` hooks (DB, scrypt, `app.ready()`) at the default 10 s and verify keeps failing under load. (source: [[financas-pessoais]], [[audit-dashboard]], 2026-10-24)

## Stack: vite

- On Windows, `os.tmpdir()` can return an 8.3 path with `~` (e.g. `EXT_TI~1`) and Vite refuses to serve paths with `~`: in tests that start Vite use `realpathSync.native(mkdtempSync(...))`. (source: [[audit-dashboard]], 2026-10-24)
