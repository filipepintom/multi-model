# Raw — security (opus)

1. medium/high — guard.js:197-211 (+:18, :234, build SKILL.md:35): repo-supplied .studio/verify runs on any `git commit` (PreToolUse, before the permission prompt), in any session; content not checked by the guard's own rules. Reproduced (marker created). M.
2. medium/high — graphify references/query.md:14-19 (+SKILL.md:54, :648, update.md:10, add-watch.md:10): repo-shipped graphify-out/.graphify_python is executed via `$(cat ...) -c`; fast path skips Step 1; guard only re-resolves when missing. Reproduced. S.
3. medium/high — guard.js:73-88 (+:69, :215): nested shells (`bash -c`, `sh -c`, `cmd /c`, `powershell -Command`, `bash <<EOF`) skip all guard rules. Reproduced (exit 0 vs 2 unwrapped). S.
4. medium/high — guard.js:116-136: delete targets from variables (`rm -rf "$OUT"/*`, `Remove-Item "$dir\*"`, `%SystemDrive%\`, `${env:USERPROFILE}`) pass; empty variable expands to root. Reproduced. S.
5. medium/medium — knowledge.js:56-62 (+retro SKILL.md:10, :44, setup:37, build:23): retro promotes lessons from repo-supplied docs/studio files into personal lessons injected with priority into every future prompt. S.
6. medium/medium — doctor.js:26 (+impeccable.cmd:57, :201, guard.js:29): on Windows cmd.exe resolves git/python/uv/impeccable from cwd before PATH; planted git.cmd runs on setup/commit/push. Not reproduced (no Windows). S.
7. medium/high — impeccable launcher:122-182 (+impeccable.cmd:117, hooks.json:31, graphify SKILL.md:113, reviewer.md:23): detector binary checked only against same-origin sidecar; graphifyy and `npx impeccable` unversioned. M.
8. low/medium — reverser-live.md:7: gdb_console, execute_rizin_command, rizin_debug_command, cutter_command can run host shell commands outside the guard. S.
9. low/high — guard.js:63: .env check case-sensitive; `.ENV` overwrites `.env` on APFS/NTFS. Reproduced. S.
10. low/high — guard.js:165-189: `& "C:\Program Files\Git\cmd\git.exe" push origin main` and `git push origin @` pass push/commit gates. Reproduced (regex). S.

Dismissed: git args constants; IMPECCABLE_*/STUDIO_KNOWLEDGE_DIR overrides need trusted env; probed candidates; POSIX command -v; fail-open intended; 40k cap; static reverser has no executesForeignCode tools; Context7 sends no user data; vendor.js maintainer-only; project-skill relative path; commit aliases.
