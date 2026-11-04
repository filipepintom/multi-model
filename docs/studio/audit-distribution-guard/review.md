# Review — audit-distribution-guard (opus, 4 rounds incl. one automated security review)

- Round 1 (47af397..3295734): CHANGES REQUESTED. Important: nested shells ignored outer assignments (`export DIR=build && bash -c 'rm -rf "$DIR"/*'` blocked). Minor: -c searched in every argument; `$_` matched; `/usr/bin/env` not a prefix.
- Round 2 (ea9d4ea, plus F9 partial, F10, F19, F20): an automated security review found that unexported outer assignments were now trusted in child shells, and that bash -O/--rcfile and pwsh abbreviated parameters hid -c. Fixed in 1ed89cb. The Opus review then found that checking the verify text re-entered the commit gate (verify ran 4 times; parts ran before the check). Minor: eval is the same shell; `export X` without `=`; `-euo pipefail`.
- Round 3 (79399a0): APPROVED. Verify runs exactly once; a verify that pushes to main is blocked before anything runs. 61 + 26 + 18 false-positive and target probes re-run, all as expected. 200 KB command: about 30 ms.
- Minor (open): `git commit` three shells deep is checked at depth 4, which returns (fail open), so verify runs without the rule pass. Not realistic.
- Not confirmed: Windows runtime. A verify written for cmd.exe changes meaning under Git Bash (`a & b`); per-user Git installs under %LOCALAPPDATA% fall back to cmd.
- After rebasing onto main: verify 56/56.
