# Spec — audit-distribution-F6 (fast)

## Goal
`/studio:graphify` runs as written on macOS, Linux and Windows with Git Bash (the Bash tool's shell on Windows), installs the graphify version the skill was vendored from, and a future re-vendor cannot reintroduce a mixed-dialect skill.

## Acceptance criteria
1. In `plugins/studio/skills/graphify/SKILL.md`, Step 1 is a single ```bash block (the upstream POSIX variant: detect interpreter via uv tool / graphify shebang / python3, install if missing, write `graphify-out/.graphify_python` with Python's `sys.executable` (no BOM), write `graphify-out/.graphify_root`). The PowerShell Step 1 and the line telling agents to use `& (Get-Content …)` are removed. One sentence states that the skill needs bash (on Windows, Git Bash, which Claude Code uses for its Bash tool).
2. Installs are pinned to the vendored version: `uv tool install graphifyy==0.9.11` and `pip install graphifyy==0.9.11` (keep the upstream `--break-system-packages` fallback only behind the plain pip attempt, as upstream does). No `--upgrade` without a pin.
3. Every use of the saved interpreter in SKILL.md and references/*.md is quoted: `"$(cat graphify-out/.graphify_python)"` (paths with spaces work).
4. `scripts/vendor.js`: after copying any skill, fail with a clear message if a copied `SKILL.md` contains both a ```powershell and a ```bash fence. In the graphify branch, rewrite unpinned `graphifyy` install commands to pin the version read from `.graphify_version`, so the pin survives a re-vendor.
5. Tests (node:test, new file `scripts/vendor.test.js` at repo root or `plugins/studio/skills/graphify.test.js` — pick one that `.studio/verify`'s glob `plugins/studio/**/*.test.js` runs; if at repo root, extend nothing, put it under plugins/studio): 
   - the vendored graphify SKILL.md has no ```powershell fence;
   - every `$(cat graphify-out/.graphify_python)` in the skill and its references is quoted;
   - every `graphifyy` install line in the skill pins `==<.graphify_version>`;
   - extract the Step 1 bash block and run it with `bash -n` (syntax check only, no install, no network).
   - vendor.js mixed-dialect check: run vendor.js on a temp copy of the repo with a fake source folder containing both fences and expect a non-zero exit and an unchanged destination (vendor.js must validate before it deletes the destination).
   All fail on current main.
6. `.studio/verify` green.

## Out of scope
F7 (trusting an existing .graphify_python), doctor's pipx check (F23), translating vendor.js messages.

## Task
T1 (tier sonnet): tests first (red), then SKILL.md/references edits and vendor.js.
