# Delivery: audit-distribution-F2 (covers F2 and F3)

## What changed
- New `plugins/studio/hooks/impeccable.js`. It runs the Impeccable launcher with telemetry off: `impeccable.cmd` with a quoted path on Windows, `sh impeccable` elsewhere. It always exits 0.
- `hooks.json`: the SessionStart, PostToolUse and Stop hooks call `node "${CLAUDE_PLUGIN_ROOT}/hooks/impeccable.js" hook`. They no longer depend on bash syntax, so they also run when Claude Code falls back to PowerShell.
- `hooks.json`: both guard entries have `"onFailure": "continue"`. A guard that cannot start, for example on Windows with neither Git Bash nor Node, no longer blocks every tool.
- `doctor.js` checks the detector the way the hooks run it. On Windows it adds a "Git Bash (Windows)" row.
- Tests: `hooks/impeccable.test.js` (new), plus an updated doctor test that now uses a missing `sh` instead of a missing exec bit.

## How to check
`node --test "plugins/studio/**/*.test.js"` gives 19/19, and `claude plugin validate plugins/studio` passes.

## Left out / open
- If a hook timeout kills only the wrapper, the launcher can keep running (minor; the old form had the same risk).
- Not run on Windows.
