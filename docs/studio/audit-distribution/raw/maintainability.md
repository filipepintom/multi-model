# Raw — maintainability (sonnet)

1. medium/high — scripts/vendor.js:36-43 (+hooks.json:31, doctor.js:69): Impeccable launcher committed 100644; hooks exec it directly; `|| true` hides EACCES; vendor.js does not restore the bit. Fix: git update-index --chmod=+x; chmod in vendor.js; X_OK check in doctor; or a node wrapper that runs `sh <launcher>`. S.
2. medium/high — doctor.js:107-114 (+knowledge.js:16, setup SKILL.md:37, README:42): knowledge dir resolved separately; on a fresh install (setup before first build) doctor says "not created yet" and skips the allow-rule check; fallback ~/.claude/studio/knowledge never checked; dirs[0] by readdir order. Fix: shared path module; compute expected path and check rule even when absent. S.
3. medium/high — doctor.js:25-28 (+:74, :134): run() ignores r.error (blank detail on EACCES/ENOENT/timeout, current output on this Mac); shell:isWin with unquoted args breaks paths with spaces on Windows; REA check reads HOME/.claude.json ignoring CLAUDE_CONFIG_DIR. S.
4. medium/medium — knowledge.js:47-75: no tests; ensurePersonal() failure (read-only/unavailable dir) drops plugin lessons and Ponytail silently; truncation cuts the tail (preferences + Ponytail); no stdin error/timeout unlike subagent.js; Ponytail header code duplicated. M.
5. low/high — scripts/vendor.js:112-116 (+README:155, plugin.json:3, NOTICES:5): release steps manual; README versions hand-typed; context7 "master"; rmSync before cpSync deletes the skill on a mistyped source. M.
6. low/medium — doctor.js:136 (+reverse SKILL.md:44,48): rea-agents@6.8.0 pin copied; doctor prints `npx rea-agents@6.8.0 setup` without -y/--client/--dry-run, unlike the skill. S.
7. low/high — doctor.js:95-99: bundled-skill list repeated; context7-mcp never checked for duplicates, graphify plugin not in the regex. S.
8. low/medium — hooks.json:31 (+:65, :76, doctor.js:69): Impeccable hook command copied 3x in POSIX-only syntax; doctor tests impeccable.cmd on Windows but no hook runs it. Fix: hooks/impeccable.js wrapper. S.
9. low/high — THIRD_PARTY_NOTICES.md:1-18 (+vendor.json:6, vendor.js): shipped notices and vendor manifest in Portuguese while plugin is English. S.

Dismissed: guard.js fail-open (documented, tested); subagent.js robust; frontmatter regex with CRLF still matches; atLeast()/version() correct; .gitignore knowledge/ (no failure today); vendor.js humanizer regex works; graphify patch idempotent; Context7 fetch status (other lens); guard timeouts intentional; Node 18 EOL is policy.
