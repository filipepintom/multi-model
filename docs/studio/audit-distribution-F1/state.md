---
slug: audit-distribution-F1
request: "Make the bundled Impeccable launcher run on macOS/Linux installs: set its git executable bit (plugins/studio/skills/impeccable/scripts/impeccable is 100644) or call it through sh from hooks.json:31/65/76 and doctor.js:74, and make doctor report the spawn error code. First a test that reproduces the problem and fails."
phase: done
mode: fast — one file mode change plus a few lines in doctor.js and one test file; no deps, no security/data
branch: studio/audit-distribution-F1
base: main
started: 2026-11-03
---

# State — audit-distribution-F1

Origin: /studio:audit audit-distribution, item F1 (high).

| Phase | Status | Notes |
|---|---|---|
| 0 Prepare | done | `.studio/verify` = `node --test "plugins/studio/**/*.test.js"` (11/11 pass) |
| 1 Idea | skipped | --skip-idea |
| 2 Spec (gate 1) | done | approved as written |
| 3 Plan | skipped | fast |
| 4 Implementation | done | 6a99856 + timeout follow-up |
| 5 Verification and review | done | verify 13/13; APPROVED |
| 6 Delivery (gate 2) | done | local merge into main (ff) |
| 7 Retro | done | retro.md |

## Escalations

<!-- date · task · reason · decision -->
