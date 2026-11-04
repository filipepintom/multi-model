# Raw — correctness (Windows, opus)

Windows behaviour read from the Claude Code 2.1.302 binary (not run on Windows): command hooks run in Git Bash when present, else PowerShell (pwsh or 5.1); `${CLAUDE_PLUGIN_ROOT}` rewritten to `${env:CLAUDE_PLUGIN_ROOT}`; "noBash" rule makes PreToolUse/PermissionRequest hook failures (exit not 0/2, timeout) blocking unless the hook sets shell:"powershell", exec form `args`, or onFailure:"continue".

1. high/high — hooks.json:31 (+:65, :76, launcher:1, doctor.js:74, impeccable SKILL.md:19): launcher 100644 (since 1173744); installed cache copy 0.9.1 also -rw-rw-r--; hook gives Permission denied rc 126, hidden by `|| true`; doctor empty detail + wrong fix. Git Bash on Windows unaffected (MSYS runs #! files). S.
2. medium/medium — hooks.json:31/65/76 (+doctor.js:69, impeccable.cmd): Windows without Git Bash: bash syntax fails in PowerShell (5.1 `||` parse error; pwsh `VAR=1` unknown command) → hook error on every edit; .cmd never used by hooks; doctor tests .cmd and can say ok. Fix: node wrapper in exec form. M.
3. medium/medium — hooks.json:43-53 (+guard.js:4): Windows without Git Bash and without Node: guard hook fails to start, noBash rule turns it into a blocking error → every Bash/PowerShell/Write/Edit denied; message points to Git for Windows. Fix: onFailure:"continue" or exec form. S.
4. medium/medium — guard.js:229 (+:169, :124): `cd /c/Users/me/proj && git push origin main` or `git -C /c/...` resolves to C:\c\Users\... on win32 → no .studio found → push/commit rules skipped. S.
5. medium/medium — guard.js:207-210 (+build SKILL.md:35, implementer.md:17): on win32 execSync runs .studio/verify in cmd.exe; `./gradlew test`, `CI=1 npm test`, `a; b` written for Git Bash fail → every commit blocked; message does not name the shell. S.
6. medium/medium — graphify SKILL.md:68-133 (+:288, :650, vendor.js:91): PowerShell Step 1 + bash later steps; runs as written on no platform; 5.1 Out-File utf8 BOM breaks `$(cat ...)`; unquoted expansion splits paths with spaces. S.
7. low/high — doctor.js:26 (+:74): shell:isWin unquoted launcher path → fails for profile with a space; DEP0190 warning on Node 24. S.

Dismissed: line endings correct (.gitattributes, ls-files --eol); quoted CLAUDE_PLUGIN_ROOT fine in both shells; knowledge/subagent path handling fine; HOME vs USERPROFILE share cache in Git Bash; constant git args; rm -rf "$USERPROFILE" no plausible command; PS backtick continuation contrived; guard.test.js maintainers only; CLAUDE_CONFIG_DIR not Windows-specific; .part litter on timeout.
