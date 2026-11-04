# Delivery: audit-distribution-F1

## What changed
- The Impeccable launcher (`plugins/studio/skills/impeccable/scripts/impeccable`) is now tracked as executable (100755). Until now it shipped as 100644, so the SessionStart, PostToolUse and Stop hooks failed with EACCES on every macOS and Linux install, and `|| true` hid the error.
- `doctor.js`: `run()` now reports the spawn error code. When the launcher cannot start, the Impeccable row says so and suggests reinstalling the plugin. The network hint is kept for a launcher that started and failed, or that timed out on the first download.
- New test `plugins/studio/scripts/doctor.test.js` covers the git mode and the EACCES case, using a copy of the plugin, a fake HOME and no network.

## How to check
`node --test "plugins/studio/**/*.test.js"` gives 13/13. `node plugins/studio/scripts/doctor.js` on this Mac shows the detector as ok (v4.7.0).

## Left out
- The hook commands are still bash-only. That is F2, next.
- A long partial output can push the error code out of the 200-character detail (minor).
- Not tested on Windows.

Installs only pick up the mode fix when the plugin version is bumped.
