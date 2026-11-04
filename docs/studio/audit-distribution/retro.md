# Retro — audit-distribution

## Numbers
- Raw findings per lens: correctness/Windows 7, correctness/setup 9, security 10, maintainability 9 (35 total).
- Merged into 25 candidates plus 1 observed (M9). 8 candidates merged findings from 2 or 3 lenses (F1, F2, F4, F5, F6, F15, F21, F22).
- Verification: 1 refuted (F14, security: Claude Code already sets NoDefaultCurrentDirectoryInExePath=1). 9 lowered by the verifiers (F3, F4, F5, F7, F9, F10, F11, F12, F17, mostly medium → low). 8 plausible.
- Refuted per lens: security 1, others 0.

## Fixed items
Backlog 15/15:
- F1, F2+F3, F6, F8, F16, F24 and the doctor batch (F4, F5, F21, F22, F23) each had their own build.
- F11, F12 and F13 were fixed together in the guard build.

Outside the backlog, under the user's goal:
- F9 (partial), F10, F19 and F20 were fixed in the guard build.
- F25 and M9 were fixed in the F8 follow-up and the extras branch.
- F7, F15 (partial), F17 and F18 were fixed in the extras branch.

Review rounds: F1 1, F2 1, F6 2, F8 1, F16 2, doctor 1, guard 3 (plus one automated security review), extras 2+.

## Recurring false positives
None was refuted more than once, so the lens rubrics stay as they are.

## Lessons
The user confirmed 3 of the 5 candidates in one batch. They are saved under General in the personal lessons.md: the paired blocked test, no scope on a branch in review, and vendored snippets run with fake tools. Two were rejected (the AskUserQuestion limits, and editing and committing in separate calls) and stay listed here only.

Candidates:
- Guard-style rules: every test that relaxes a rule needs a paired blocked test for the nearest unsafe variant. Fixing a false positive in the guard opened a false negative, and an automated security review found it, not ours.
- Do not add scope to a branch that is under review. Adding F9, F10, F19 and F20 mid-review cost a review round and caused the verify re-entry bug.
- When a spec relies on AskUserQuestion, write its limits (2 to 4 options per question, at most 4 questions) and what happens to the overflow.
- Vendored shell snippets need an acceptance test that runs them with fake tools, not only `bash -n`. upstream graphify's `uv tool run graphifyy` never worked.
- A command that both edits a file and commits it is checked by the guard against the old file: run them as separate calls.
