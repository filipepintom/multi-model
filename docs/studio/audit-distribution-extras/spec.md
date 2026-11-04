# Spec — audit-distribution-extras (fast, several small tasks)

Verified audit items outside the top-15 backlog, done under the user's goal "finish all tasks". The guard.js ones (F9, F10, F19, F20) are in the guard branch.

## T1 — F18: reverser-live raw consoles
Remove `mcp__rea__gdb_console`, `mcp__rea__execute_rizin_command`, `mcp__rea__rizin_debug_command`, `mcp__rea__cutter_command` from plugins/studio/agents/reverser-live.md `tools:`. Add one line to its prompt: raw debugger consoles are not available; use the structured GDB/rizin/Frida tools. Update the README "Tool decisions" REA row to say these four are also left out. Test (node:test): reverser-live's tools contain none of the four and none of uninstall_adb_package/push_adb_file; reverser (static) has no runtime tool (none of the names starting with capture_, observe_, start_frida, instrument_, gdb_, rizin_debug, install_adb).

## T2 — F7: trust in graphify-out/.graphify_python
In plugins/studio/skills/graphify/SKILL.md "Interpreter guard for subcommands" (applies before query/path/explain/--update/--cluster-only/add): re-resolve the interpreter not only when the file is missing but also when its content is not an absolute path to an existing file whose basename matches `python[0-9.]*` (optionally `.exe`), or when `"$P" -c "import graphify"` fails. Say explicitly that the file may come from a cloned repository and is not trusted as is. Test: extract the guard block; in a temp dir with a `.graphify_python` containing `sh evil.sh` (evil.sh touches a marker) and a fake python on PATH, running the guard rewrites the file and the marker is not created; with a valid fake python path it keeps the file.

## T3 — F17: knowledge.js failure modes
- `ensurePersonal()` failure (unwritable folder) no longer drops everything: inject the header, the plugin lessons and (on build) Ponytail, plus one line "Personal lessons unavailable: <path> (<error code>)".
- Truncation keeps the header, plugin lessons, preferences and Ponytail, and cuts the personal lessons section first, with the existing "[truncated: consolidate …]" note at the cut.
- Tests in plugins/studio/hooks/knowledge.test.js: read-only STUDIO_KNOWLEDGE_DIR parent → output contains plugin lessons and the "unavailable" line; a 39 000-character lessons.md plus a preferences marker → preferences marker and "PONYTAIL MODE ACTIVE" present, output ≤ 40 000 + note. Keep fail-open on bad stdin.

## T4 — F15 (partial): unpinned runtime fallback
In plugins/studio/agents/reviewer.md, the last-resort `npx impeccable` becomes `npx -y impeccable@<version>` where version is the bundled skill's frontmatter `version` (4.7.0), and add a test asserting the pin equals skills/impeccable/SKILL.md's version. Leave the detector-binary hash as is (needs network to compute; note it in delivery).

## T5 — F25 + M9: release check and English vendor text
- New `scripts/check-release.js` (no deps): fails (exit 1, one line per problem) when: a README "Bundled skills" version differs from vendor.json; a folder in plugins/studio/skills is neither a studio skill (build, audit, reverse, retro, setup) nor a vendor.json entry (context7 → context7-mcp); the Impeccable launcher is not git mode 100755; plugin.json is invalid JSON or has no version. Prints "release check ok" otherwise. A test runs it on the repo (must pass now) and on a temp copy with a mismatched README version (must fail).
- Translate scripts/vendor.js comments, usage line and the `notes` strings it writes to English; update plugins/studio/vendor.json notes to the same English text. README line "Updating bundled skills" mentions `node scripts/check-release.js`.

## General
`.studio/verify` green after each task; one commit per task, message says why. No network.
