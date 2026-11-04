# Raw — correctness (setup and packaging, opus)

Repro in a fresh git clone and fake HOME under the scratchpad.

1. high/high — hooks.json:31-76 (+impeccable launcher:1, doctor.js:74, reviewer.md:23, impeccable SKILL.md:19): launcher 100644 in a fresh clone; hook run gives Permission denied rc=126, `|| true` hides it; doctor shows empty detail + "needs network" fix; reviewer falls back to unpinned `npx impeccable`. Fix: run through `sh` in hooks/doctor/reviewer; git update-index --chmod=+x; show r.error.code. S.
2. medium/high — skills/graphify/SKILL.md:68-123 (+:288, :113, vendor.js:94): vendored graphify is the Windows variant; Step 1 (install + write .graphify_python) is PowerShell only; no pwsh on macOS; Step 2 `$(cat graphify-out/.graphify_python)` fails. graphifyy installed unpinned. M.
3. medium/high — THIRD_PARTY_NOTICES.md:7-11 (+modern-screenshot.umd.js, vendor.js:38, plugin.json): no LICENSE for impeccable (Apache-2.0) and graphify; modern-screenshot (MIT) bundled without attribution; studio itself has no licence. S.
4. medium/medium — doctor.js:107-122 (+knowledge.js:16): knowledge dir resolution differs; (A) fallback ~/.claude/studio/knowledge created but doctor says "not created yet"; (B) /^studio-/ matches other plugins (studio-kit-acme) → reports/grants for the wrong folder. Reproduced both. S.
5. low/medium — doctor.js:26-75 (+hooks.json:31): Windows doctor runs impeccable.cmd via shell with unquoted path (fails with spaces) and tests a launcher no hook uses. S.
6. low/high — doctor.js:95-101 (+README:151): duplicate check skips Context7 (skill, plugin, user MCP). S.
7. low/medium — doctor.js:133-136: REA check reads only HOME/.claude.json user scope (ignores CLAUDE_CONFIG_DIR, local/project scope); printed command differs from reverse skill. S.
8. low/medium — doctor.js:64-66 (+graphify SKILL.md:112): doctor accepts pipx, skill only uses uv or pip. S.
9. low/high — .gitignore:6: `knowledge/` also ignores plugins/studio/knowledge/ new files. Fix `/knowledge/`. S.

Dismissed: live-browser.js references to scripts/live/*.mjs (comments); .claude/skills/impeccable paths resolved via base dir; CRLF in working copy only; versions consistent; Context7 GET covered by live test; allow-rule substring match; setup path to doctor ok; 180 s timeout vs Bash 120 s not shown.
