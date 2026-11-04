# Delivery: audit-distribution-F6

## What changed
- `plugins/studio/skills/graphify/SKILL.md`: Step 1 is one bash block, based on upstream's POSIX variant. It finds the interpreter through `uv tool dir`, then the graphify shebang, then python3, python or `py -3`, before and after installing. It installs `graphifyy==0.9.11` and writes `.graphify_python` without a BOM. The PowerShell blocks are gone, and the skill states that it needs bash (Git Bash on Windows).
- Every use of `$(cat graphify-out/.graphify_python)` in the skill and its references is quoted, so paths with spaces work.
- Every `graphifyy` install line is pinned to 0.9.11, extras included.
- `scripts/vendor.js` refuses a skill that mixes powershell and bash fences, and checks this before deleting anything. When graphify is vendored again, it pins the install lines to `.graphify_version`.
- New test file `plugins/studio/scripts/vendor.test.js` with 6 tests: dialect, quoting, pins, `bash -n`, the vendor.js refusal, and a run of Step 1 with a fake uv.

## How to check
`node --test "plugins/studio/**/*.test.js"` gives 25/25.

## Left out / open
- Not run on Windows, and no real install was done. The first real `/studio:graphify` run on a machine without graphify will be the actual check.
- If `uv tool install` fails offline and a system python exists, the failure only shows in Step 2 (minor).
