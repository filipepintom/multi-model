# Spec — audit-distribution-F1 (fast)

## Goal
The bundled Impeccable launcher runs on macOS/Linux installs, and when it cannot start, `/studio:setup` says why instead of blaming the network.

## Acceptance criteria
1. `git ls-files -s plugins/studio/skills/impeccable/scripts/impeccable` reports mode `100755`.
2. In `plugins/studio/scripts/doctor.js`, `run()` includes the spawn error (`r.error.code`, or its message) in `out` when the process did not start or timed out, and returns `error`.
3. When the Impeccable check fails because of a spawn error (e.g. EACCES), its detail names the error and the fix does not tell the user to go online; the network fix stays only for a launcher that started and failed.
4. New `plugins/studio/scripts/doctor.test.js` (node:test) covers 1 and 3:
   - asserts the git mode of the launcher is 100755;
   - copies the plugin to a temp dir, removes the launcher's exec bit, runs `doctor.js --json` with a fake HOME and a preloaded stub that makes `fetch` reject (no network), and asserts the Impeccable row has status `warn`, detail containing `EACCES`, and a fix that does not mention network. Skipped on win32.
   Both tests fail on the current code before the fix.
5. `.studio/verify` is green; no other behaviour of doctor.js changes (same rows, same order).
6. Hook commands in hooks.json are not changed here (that is F2).

## Out of scope
Windows launcher choice and the node wrapper (F2), quoting paths with spaces (F4), other doctor checks.

## Task
T1 (tier sonnet): the test first (red), then the mode change with `git update-index --chmod=+x` and the doctor.js changes.
