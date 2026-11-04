---
slug: audit-distribution-F2
request: "Replace the three Impeccable hook commands in hooks.json with one cross-platform node wrapper that picks impeccable.cmd on Windows and sh impeccable elsewhere and always exits 0; make doctor.js test that same wrapper and report Git Bash on Windows; make the guard hooks fail open on Windows without Git Bash (F3)."
phase: done
mode: fast — hooks.json, one new hook script, doctor.js and tests; no deps, no data
branch: studio/audit-distribution-F2
base: main
started: 2026-11-03
---

# State — audit-distribution-F2

Origin: /studio:audit audit-distribution, items F2 (medium, plausible) + F3 (low, plausible).

| Phase | Status | Notes |
|---|---|---|
| 0 Prepare | done | verify = .studio/verify |
| 1 Idea | skipped | --skip-idea |
| 2 Spec (gate 1) | done | approved as written |
| 3 Plan | skipped | fast |
| 4 Implementation | done | 0e53a49 |
| 5 Verification and review | done | verify 19/19; APPROVED |
| 6 Delivery (gate 2) | done | local merge into main (user goal: finish all) |
| 7 Retro | done | retro.md |

## Escalations

<!-- date · task · reason · decision -->
