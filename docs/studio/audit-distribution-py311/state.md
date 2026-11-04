---
slug: audit-distribution-py311
request: "Close the last F7 gap: PYTHONSAFEPATH only protects Python 3.11+, and 3.10 is end of life (October 2026), so studio's graphify requires 3.11+."
phase: done
mode: fast
branch: studio/audit-distribution-py311 (merged into main, e425401)
started: 2026-11-03
---

# State — audit-distribution-py311

- Implementation e425401: `_py311` (`"$P" -V`) runs before any -c/-m in Step 1 and in the interpreter guard; 3.10 candidates are skipped, and with none left the skill exits 1 with a message. The doctor row and README now say 3.11+. Verify 87/87.
- Real run on this Mac: Step 1 in a temp project gave rc 0 and picked the uv tool python 3.13.13 (no install, no network).
- Review (sonnet): APPROVED. The parser handles rc, CRLF, empty output and the Windows Store stub. Minor (open): doctor's pip check still runs `-m pip` before its version check (informational only); if the shebang interpreter is missing, the guard does not try python3.
