# Retro — audit-distribution-F6

- 1 implementer, 2 review rounds (1 change request), 0 tier escalations.
- What went wrong: the spec told the implementer to adapt upstream Step 1 without saying it was untested upstream; the uv branch never worked. Cause: vendored code was trusted as correct. A fake-tool run of the extracted block (now a test) caught it.
- Lesson candidate (general, promoted at the audit retro if it recurs): when a spec vendors a shell snippet, add an acceptance test that runs it with fake tools, not only `bash -n`.
