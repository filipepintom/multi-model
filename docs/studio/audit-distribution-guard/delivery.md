# Delivery: audit-distribution-guard (F13, F11, F12, plus F9 partial, F10, F19 and F20)

## What changed in `plugins/studio/hooks/guard.js`
- Git Bash paths: `msysToNative()` maps `/c/...` and `/cygdrive/c/...` to `C:\...` on Windows for `cd` and `git -C` targets and for the hook's cwd. It also expands `~` for `git -C`. With this, the studio's push and commit rules apply on Windows (F13).
- Nested shells: the guard now checks the script passed to bash/sh/zsh/dash/ksh `-c` (also `-lc`, `-euo pipefail -c`, `-O`, `--rcfile`), cmd `/c`, `/k` and `//c`, powershell/pwsh `-Command` (prefixes, and values such as `-ep`), and `eval`, up to 3 levels deep. A child shell only inherits exported variables and prefix assignments; eval and double-quoted scripts see every variable (F11).
- Deletes: it blocks a target that is just a variable followed by `/` or `/*` (`rm -rf $BUILD_DIR/*`) unless the command assigns that variable. It also blocks `${env:USERPROFILE}`, `$env:SystemDrive`, `%SystemDrive%\` and `%HOMEDRIVE%%HOMEPATH%` (F12).
- `.env` is now matched regardless of case (F19).
- git called through a quoted path with spaces is recognised, and `@` is treated like HEAD in a push (F20).
- On Windows, `.studio/verify` runs in Git Bash when it exists and in cmd otherwise; the message names the shell (F10).
- Before running, the text of `.studio/verify` goes through the guard's rules and runs only once (F9, partial: there is still no approval of who wrote the file).
- `guard.js` exports `msysToNative` and `verifyShell` for tests, only when it is loaded with require.

## How to check
`node --test "plugins/studio/**/*.test.js"` gives 56/56.

## Open
- Not run on Windows.
- A verify written for cmd.exe can behave differently in Git Bash.
- A per-user Git install is not detected.
- The guard catches mistakes; it is not a sandbox.
