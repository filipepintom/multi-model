# Spec — audit-distribution-F2 (fast)

## Goal
The Impeccable hooks run the same way under Git Bash and PowerShell on Windows and under sh on macOS/Linux; a guard hook that cannot start never blocks every tool; doctor tests the same path the hooks use.

Background (from the audit, read in the Claude Code 2.1.302 binary): command hooks run in Git Bash when found, else PowerShell, with `${CLAUDE_PLUGIN_ROOT}` rewritten to `${env:CLAUDE_PLUGIN_ROOT}`. When Git Bash is missing, a PreToolUse hook without `shell: "powershell"`, without `args` and without `onFailure: "continue"` turns any exit other than 0/2 into a blocking error.

## Acceptance criteria
1. New `plugins/studio/hooks/impeccable.js` (Node, no deps):
   - sets `IMPECCABLE_NO_TELEMETRY=1` in the child env;
   - on win32 runs `skills/impeccable/scripts/impeccable.cmd` with its path quoted (paths with spaces work); elsewhere runs `sh <skills/impeccable/scripts/impeccable>`, so the exec bit does not matter;
   - forwards its own argv and stdin to the launcher; the launcher's stdout/stderr reach the hook's stdout/stderr;
   - always exits 0, including when the launcher is missing, fails to spawn, or exits non-zero.
2. `plugins/studio/hooks/hooks.json`: the SessionStart, PostToolUse and Stop Impeccable hooks use `node "${CLAUDE_PLUGIN_ROOT}/hooks/impeccable.js" hook` with the same timeouts; no `VAR=` prefix, no `||`.
3. `hooks.json`: both PreToolUse guard entries get `"onFailure": "continue"`. Their command, matcher and timeout do not change.
4. `scripts/doctor.js`: the Impeccable check runs `node hooks/impeccable.js --version`… only if that still yields the version; otherwise keep running the launcher but through the same platform rule as the wrapper (sh on POSIX, quoted .cmd on win32). Pick whichever keeps the existing ok/warn output and the F1 EACCES test meaningful (update that test if the exec bit no longer matters, so it still proves a launcher that cannot start is reported). On win32 add a row "Git Bash (Windows)": ok when `CLAUDE_CODE_GIT_BASH_PATH` points to an existing file or `bash.exe` is found under Program Files\Git, else warn with the fix "Install Git for Windows (https://git-scm.com/download/win); without it hooks run in PowerShell".
5. Tests (node:test), failing on current main before the change:
   - hooks.json: no Impeccable hook command contains `IMPECCABLE_NO_TELEMETRY=` or `||`; every hook command starts with `node `; both guard entries have `onFailure: "continue"`;
   - wrapper exits 0 when the launcher is missing and when it exits 1;
   - wrapper passes argv and `IMPECCABLE_NO_TELEMETRY=1` to a fake launcher (copy the plugin to a temp dir and replace the launcher with a script that writes its args/env to a file); POSIX only for the fake sh launcher.
6. `claude plugin validate plugins/studio` passes. `.studio/verify` green. If validate rejects `onFailure`, use exec form for the guard (`"command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/guard.js"]`) instead and record it in state.md.

## Out of scope
Quoting in doctor's other commands (F4), README changes beyond one line if the hook list is documented there.

## Task
T1 (tier sonnet): tests first (red), then wrapper, hooks.json, doctor.js.
