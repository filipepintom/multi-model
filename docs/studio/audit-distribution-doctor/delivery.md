# Delivery: audit-distribution-doctor (F5, F21, F22, F23; F4 already fixed by F1 and F2)

## What changed
- New `hooks/paths.js` with `knowledgeDir()`, used by both `knowledge.js` and the doctor. It resolves the folder in this order: `STUDIO_KNOWLEDGE_DIR`, `CLAUDE_PLUGIN_DATA/knowledge`, the studio data folder named after the `studio@<marketplace>` key in `installed_plugins.json`, and finally `<CLAUDE_DIR>/studio/knowledge`. Both honour `CLAUDE_CONFIG_DIR`.
- On a fresh install the doctor prints the expected folder and still checks the allow rule. It never picks another plugin's `studio-*` folder.
- The duplicates check comes from `vendor.json` and now covers the Context7 skill, the `graphify@` and `context7@` plugins, and a `context7` MCP server in `.claude.json`. `setup/SKILL.md` gained the matching fixes.
- The REA check reads `.claude.json` under `CLAUDE_CONFIG_DIR` and accepts project-scoped registration. Its fix text matches `/studio:reverse`.
- The graphify installer row accepts uv, or pip through the Python that was found. pipx alone now warns. The README row is updated.

## How to check
`node --test "plugins/studio/**/*.test.js"` gives 43/43. `node plugins/studio/scripts/doctor.js` shows the same rows as before on this Mac; the installer row is renamed.
