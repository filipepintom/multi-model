# Spec — audit-distribution-guard (full: security)

Covers audit items F13 (medium, plausible), F11 (low), F12 (low). All in plugins/studio/hooks/guard.js. The guard "catches mistakes, it is not a sandbox" (README): the goal is the commands an agent plausibly writes, not deliberate evasion.

## Acceptance criteria (revised after the critic: GO WITH CHANGES)

### A. Paths (F13)
1. One helper `msysToNative(p, platform = process.platform)` in guard.js resolves path arguments for `cd`/`pushd`/`Set-Location` (:229) and `git -C` (:169), and `data.cwd`: it expands `~`, and on win32 maps `^/(?:cygdrive/)?([a-z])(?=/|$)` (case-insensitive) to `X:\…`; `/c` alone becomes `C:\` (not `C:`). Native paths (`C:/Users`, `C:\x`) and relative paths are unchanged; on other platforms only `~` is expanded. This also fixes `git -C ~/proj` on every OS.
2. guard.js wraps its stdin block in `if (require.main === module) { … } else module.exports = { msysToNative }` so tests can require it without the hook exiting. No other export; no new module.
3. Tests: `/c/Users/me/proj` → `C:\Users\me\proj`, `/cygdrive/d/x` → `D:\x`, `/c` → `C:\`, `/cache/x` unchanged, `C:/Users` unchanged, darwin unchanged, `~/p` expanded; and via the hook on this Mac: `git -C ~/<studio repo> push origin main` is blocked.

### B. Nested shells (F11)
4. After the existing PREFIX handling, when the command word is a shell or evaluator, its script is checked with `checkCommand` using the `dir` at that point (a `cd` inside does not leak out), recursion depth at most 3 (deeper: return, fail open):
   - `bash|sh|zsh|dash|ksh` (optionally with a path, `.exe`): the token after the first flag matching `^-[a-zA-Z]*c[a-zA-Z]*$` (`-c`, `-lc`, `-ec`);
   - `cmd(.exe)`: the remaining tokens joined, after `/c`, `/k` or `//c` (case-insensitive);
   - `powershell|pwsh(.exe)`: the remaining tokens joined, after `-Command`, `-c` or a prefix abbreviation such as `-Com` (case-insensitive); `-File` is never recursed;
   - `eval`: all arguments joined.
   Heredocs stay data (no change). Backslash escapes inside -c strings are a known limit, not handled.
5. Tests, blocked: `bash -c "rm -rf /"`, `bash -lc "rm -rf ~"`, `sh -c 'rm -rf ~'`, `cmd /c "rd /s /q C:\"`, `cmd //c "rd /s /q C:\"`, `powershell -Command "Remove-Item -Recurse C:\"`, `pwsh -c "git push origin main"` (studio repo), `bash -c "git push --force origin x"` (studio repo), `bash -c "git commit -m x"` with a failing verify, `eval "rm -rf /"`. Pass: `bash -c "echo hi"`, `bash -lc "npm test"`, `cmd //c "rd /s /q build"`, `sh -c "rm -rf build"`, `eval "$(ssh-agent -s)"`, `eval "$(pyenv init -)"`, `cat > deploy.sh <<'EOF'\ngit push origin main\nrm -rf "$OUT"/*\nEOF`, and `git commit -m "$(cat <<'EOF'\nmsg\nEOF\n)"` in a studio repo with a passing verify.

### C. Delete targets (F12)
6. ROOT_TARGETS also covers `${env:USERPROFILE}` and the other `$env:` names in brace form, `$env:SystemDrive`, `%SystemDrive%` (optionally followed by `\`, `/` or `\*`), and `%HOMEDRIVE%%HOMEPATH%`.
7. A delete target that is only a variable plus a separator and an optional `*` — the whole token matches `^\$(?:[A-Za-z_]\w*|\{[A-Za-z_]\w*\})[\\/]\*?$` (quotes already removed by parse) — is blocked, unless the command text assigns that variable anywhere (case-insensitive: `X=`, `export|local|set|declare X=`, `for X in`, `read X`, PowerShell `$X =` / `$X=`, `foreach ($X in`). Positional/special parameters (`$1`, `$@`), `${X:…}` forms and anything with more path after the variable pass. Message: each tool call is a fresh shell, so an unset `$X` turns this into `/*`; set it in the same command, use `${X:?}` in bash, or use a literal path.
8. Tests, blocked: `rm -rf $BUILD_DIR/*`, `rm -rf "$OUT"/`, `Remove-Item -Recurse ${env:USERPROFILE}`, `rd /s /q %SystemDrive%\`, `Remove-Item -Recurse $env:SystemDrive\`. Pass: `rm -rf "$TMPDIR"/foo`, `rm -rf "$(mktemp -d)"/x`, `rm -rf $HOME/.cache/x`, `OUT=dist; rm -rf "$OUT"/*`, `$dir = "build"; Remove-Item -Recurse $dir\*`, `rm -rf "${OUT:?}"/*`, `find . -exec sh -c 'rm -rf "$1"/*' _ {} \;`, `rm -rf "$OUT"`.

### General
9. Existing guard tests still pass; `.studio/verify` green; fail-open on internal errors unchanged.

## Out of scope
F19 (.env case), F20 (git path with spaces, `@`), F9/F10 (verify execution), Windows runtime testing.

## Plan
- T1 (opus): A + B, tests first.
- T2 (sonnet, after T1, same branch): C, tests first.
Cut by the critic: heredocs fed to a shell, `/mnt/c`, `\\?\\`, `%X%\\` and `$X*` forms.
Reviewer: opus.
