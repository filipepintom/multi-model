# Spec — audit-distribution-doctor (fast)

Covers audit items F5, F21, F22, F23 (all low, confirmed). F4 was already fixed by F1 (spawn error reported) and F2 (launcher path quoted on Windows); mark it fixed. Files: plugins/studio/scripts/doctor.js, plugins/studio/hooks/knowledge.js (one line), a new small shared module if useful, tests.

## Acceptance criteria
1. F5, knowledge folder:
   - doctor and hooks/knowledge.js resolve the personal folder with the same rule, in one shared helper (e.g. plugins/studio/hooks/paths.js exporting `knowledgeDir(env)`): `STUDIO_KNOWLEDGE_DIR`, else `CLAUDE_PLUGIN_DATA/knowledge`, else the studio data folder `<CLAUDE_DIR>/plugins/data/studio-<marketplace>/knowledge` where `<marketplace>` comes from the `studio@<marketplace>` key in `<CLAUDE_DIR>/plugins/installed_plugins.json`, else `<CLAUDE_DIR>/studio/knowledge`. `CLAUDE_DIR` = `CLAUDE_CONFIG_DIR` or `~/.claude` in both scripts.
   - a data folder of another plugin whose name starts with `studio-` is never picked.
   - when the folder does not exist yet, doctor still prints the expected path (warn, "created on first build/audit/retro") and still runs the allow-rule check against that path, so /studio:setup can offer the rule on a fresh install.
2. F21, duplicates: the skill list comes from vendor.json keys, mapped to folder names (context7 → context7-mcp); the plugin check matches all of them (`graphify@`, `context7@` included); a `context7` entry in the user's `.claude.json` `mcpServers` is reported as a duplicate MCP server.
3. F22, REA: read `<CLAUDE_CONFIG_DIR or HOME>/.claude.json`; `mcpServers.rea` → ok "registered"; only under `projects[*].mcpServers.rea` → ok "registered for some projects"; else warn. The fix text is the same two commands /studio:reverse shows (`npx -y rea-agents@6.8.0 doctor --client claude_code --json`, then `... setup --client claude_code --dry-run --json`), plus "restart Claude Code after setup".
4. F23, graphify installer: ok only for what skills/graphify/SKILL.md Step 1 actually uses (uv, or pip run as `<python> -m pip` for the Python found above); pipx alone → warn with "install uv". The Python row's fix text stops mentioning pipx.
5. Tests (node:test, extend plugins/studio/scripts/doctor.test.js): fake CLAUDE_CONFIG_DIR/HOME and fetch stub (as the existing test does) for: fresh install (expected path printed + allow-rule row present); two data folders `studio-kit-acme` and `studio-studio-local` with installed_plugins.json `studio@studio-local` → the latter; context7-mcp skill + graphify plugin + user context7 MCP → all three listed; REA under CLAUDE_CONFIG_DIR and under projects scope → ok; only pipx on PATH → warn. knowledge.js and doctor agree on the folder for the same env (test the helper directly). All fail on current main.
6. `.studio/verify` green; `node plugins/studio/scripts/doctor.js` on this machine shows the same rows as before plus or minus the changed details.

## Out of scope
Changing where the knowledge folder lives; setup/SKILL.md wording (only if a sentence names doctor output that changed).

## Task
T1 (sonnet): tests first, then helper, doctor.js, knowledge.js.
