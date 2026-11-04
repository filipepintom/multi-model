# Consolidated candidates (phase 5) — audit-distribution

Raw details: raw/correctness-windows.md (CW), raw/correctness-setup.md (CS), raw/security.md (S), raw/maintainability.md (M).

| id | sev | title | location | sources |
|---|---|---|---|---|
| F1 | high | Impeccable launcher not executable (100644): detector hooks fail silently on macOS/Linux; doctor blames network | hooks.json:31 (+:65,:76, skills/impeccable/scripts/impeccable, doctor.js:74) | CW1, CS1, M1 |
| F2 | medium | Impeccable hooks are bash syntax; on Windows without Git Bash they fail in PowerShell; .cmd launcher unused while doctor tests it | hooks.json:31 (+:65,:76, doctor.js:69) | CW2, M8 |
| F3 | medium | Windows without Git Bash: guard hook start failure (no Node) becomes blocking for every tool call (noBash rule) | hooks.json:43,53 | CW3 |
| F4 | medium | doctor run() drops spawn error (blank detail) and passes unquoted paths to cmd.exe (profile with space) | doctor.js:25-28,74 | M3, CS5, CW7 |
| F5 | medium | knowledge dir resolved differently by doctor and knowledge.js: fresh install never offered the allow rule; fallback dir ignored; /^studio-/ can pick another plugin's folder | doctor.js:107-122 (+knowledge.js:16) | M2, CS4 |
| F6 | medium | vendored graphify SKILL.md mixes PowerShell Step 1 with bash steps; first run as written fails on every platform | skills/graphify/SKILL.md:68-133 | CS2, CW6 |
| F7 | medium | repo-shipped graphify-out/.graphify_python is executed by query/path/explain/update/add | skills/graphify/references/query.md:14-19 (+SKILL.md:54,:648) | S2 |
| F8 | medium | licence texts missing for Impeccable (Apache-2.0), graphify, modern-screenshot; studio has no licence | THIRD_PARTY_NOTICES.md:7-11 | CS3 |
| F9 | medium | repo-supplied .studio/verify runs on any git commit, before the permission prompt, unchecked by guard rules | guard.js:197-211 | S1 |
| F10 | medium | on Windows the commit gate runs .studio/verify in cmd.exe, not the shell agents use | guard.js:207-210 | CW5 |
| F11 | medium | nested shells (bash -c, sh -c, cmd /c, powershell -Command, bash heredoc) skip every guard rule | guard.js:73-88 | S3 |
| F12 | medium | delete targets from variables ("$OUT"/*, "$dir\*", %SystemDrive%\, ${env:USERPROFILE}) pass the guard | guard.js:116-136 | S4 |
| F13 | medium | Git Bash drive paths (/c/...) in cd and git -C resolve wrong on win32 → push/commit rules skipped | guard.js:229 (+:169) | CW4 |
| F14 | medium | Windows: cmd.exe resolves git/python/uv/impeccable from cwd before PATH (doctor, guard git(), impeccable.cmd) | doctor.js:26 (+guard.js:29, impeccable.cmd:57,:201) | S6 |
| F15 | medium | runtime downloads not pinned by the plugin: detector binary checked against same-origin sidecar; graphifyy and npx impeccable unversioned | skills/impeccable/scripts/impeccable:122-182 (+graphify SKILL.md:113, reviewer.md:23) | S7, CS2 |
| F16 | medium | retro can promote lessons from repo-supplied docs/studio files into personal lessons injected with priority everywhere | knowledge.js:56-62 (+retro SKILL.md:10,:44) | S5 |
| F17 | medium | knowledge.js untested; personal-dir failure drops plugin lessons and Ponytail silently; truncation cuts preferences/Ponytail first | knowledge.js:47-75 | M4 |
| F18 | low | reverser-live has raw gdb/rizin/cutter consoles that run host shell commands outside the guard | agents/reverser-live.md:7 | S8 |
| F19 | low | .env check case-sensitive: .ENV overwrites .env on APFS/NTFS | guard.js:63 | S9 |
| F20 | low | git by full path with spaces (C:\Program Files\Git\cmd\git.exe) and `@` refspec skip push/commit gates | guard.js:165-189 | S10 |
| F21 | low | duplicate check skips Context7 (skill, plugin, user MCP) and graphify plugin | doctor.js:95-101 | CS6, M7 |
| F22 | low | REA check reads only HOME/.claude.json user scope; printed setup command differs from reverse skill | doctor.js:133-136 | CS7, M6 |
| F23 | low | doctor accepts pipx for graphify, skill never uses it | doctor.js:64-66 | CS8 |
| F24 | low | .gitignore `knowledge/` also ignores new files in plugins/studio/knowledge/ | .gitignore:6 | CS9 |
| F25 | low | release steps manual (README versions, plugin.json bump, context7 "master"); vendor.js rmSync before checking source | scripts/vendor.js:112-116 (+:36) | M5 |

Also observed (not verified, 26th): shipped THIRD_PARTY_NOTICES.md and vendor.json notes are in Portuguese (M9).

Chains: F11 + F12 (a wrapped or variable-based delete both skip the delete rule). F16 → F9 (a poisoned lesson can tell agents to write .studio/verify, which runs on the next commit). F1 + F2 + F4 (doctor reports the detector wrongly on every platform).
