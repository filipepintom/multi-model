# Map — audit-distribution

Repo root: /Users/filipemelo/Documents/Projetos/multi-model. Plugin: plugins/studio (v0.10.0). Marketplace: .claude-plugin/marketplace.json ("studio-local", source ./plugins/studio). No package.json; everything runs on the user's Node (>=18) through Claude Code.

## Stack and how it runs
- Claude Code plugin: skills (Markdown), agents (Markdown), hooks (hooks.json → node scripts and a vendored sh launcher), .mcp.json (Context7 remote MCP).
- Tests: `node --test plugins/studio/hooks/guard.test.js` (11, all pass on macOS). No tests for knowledge.js, subagent.js, doctor.js, vendor.js.

## Entry points
Hooks (plugins/studio/hooks/hooks.json):
- UserPromptSubmit :8-9 `node "${CLAUDE_PLUGIN_ROOT}/hooks/knowledge.js"`
- SubagentStart :19-20 `node ".../hooks/subagent.js"`
- SessionStart :30-31 `IMPECCABLE_NO_TELEMETRY=1 "${CLAUDE_PLUGIN_ROOT}/skills/impeccable/scripts/impeccable" hook || true` (POSIX env prefix, extensionless sh script, `|| true`)
- PreToolUse `Bash|PowerShell` :42-43 and `Write|Edit|MultiEdit` :52-53 → `node .../hooks/guard.js`
- PostToolUse :64-65 and Stop :75-76 → impeccable launcher `hook || true`
Commands: /studio:build, audit, reverse, retro, setup, graphify. Agents: critic, explorer, implementer, reviewer, auditor, verifier, reverser, reverser-live.
Scripts: scripts/doctor.js (read by /studio:setup, skills/setup/SKILL.md:19); skills/impeccable/scripts/impeccable (sh) and impeccable.cmd (Windows, not referenced by hooks); scripts/vendor.js (maintainer).

## Setup / doctor coverage
doctor.js checks: Node>=18 (fail), git (fail), claude CLI (warn), Python 3.10+ (:59-63), uv/pipx/pip (:64-66), Impeccable launcher `--version` (:69-76), Context7 GET (:81-89), duplicate bundled skills/plugins/hooks (:92-104), personal lessons folder + allow rule (:107-125), Claude Security (:128-132), REA registration in ~/.claude.json (:133-136).
setup SKILL.md: runs doctor, live-tests Context7, fixes duplicates/allow rules only with OK, prints install commands for Node/git/Python/uv, installs nothing.
Not checked anywhere: graphifyy Python package (installed unpinned at first use, graphify SKILL.md:107-115), curl/wget + shasum/sha256sum for the detector download, npx/npm for REA, REA providers, Chrome for reviewer UI checks, presence of the bundled skills, whether hooks actually execute.

## Platform-specific code (main suspects)
- skills/impeccable/scripts/impeccable has git mode 100644 (not executable) but hooks exec it directly; `|| true` hides the failure; doctor shows an empty-detail warning on this Mac.
- hooks.json :31/:65/:76 use POSIX syntax; on Windows they depend on how Claude Code runs hook commands (Git Bash or not). impeccable.cmd exists but no hook uses it.
- doctor.js:26 spawnSync with `shell: isWin` and unquoted args (paths with spaces).
- guard.js:29 `git ${args}` through the shell; :207 runs `.studio/verify` through the platform shell; guard.test.js:24-30 uses sh and `git init -b main`.
- knowledge.js:16-17 knowledge dir from CLAUDE_PLUGIN_DATA or ~/.claude/studio/knowledge; doctor.js:108-110 looks only at ~/.claude/plugins/data/studio-*/knowledge and honours CLAUDE_CONFIG_DIR (knowledge.js does not).
- impeccable sh uses $HOME (fallback /nonexistent), impeccable.cmd uses %USERPROFILE%.
- graphify SKILL.md has PowerShell (:69-128) and POSIX blocks.

## Trust boundaries
- Detector binary downloaded from GitHub releases by hooks, SHA-256 sidecar from same origin (impeccable:122-186); IMPECCABLE_BIN / IMPECCABLE_DOWNLOAD_BASE / IMPECCABLE_HOME env overrides.
- graphifyy from PyPI unpinned; REA via `npx -y rea-agents@6.8.0`; Context7 remote MCP without auth.
- Hook stdin into knowledge.js, subagent.js, guard.js (all fail open).
- `.studio/verify` written by agents, run by guard.js at commit (:197-211).

## Persistent writes
Personal knowledge dir (knowledge.js:16-41); ~/.impeccable/bin cache; setup fixes (skills-disabled, settings.json backups and allow rules); project docs/studio, .studio/, .claude/worktrees/, graphify-out/; global Python env (graphifyy).

## Packaging
plugin.json has no license/repository/homepage; no root LICENSE; THIRD_PARTY_NOTICES.md :5-11 points to licence files for 3 of 5 vendored skills (impeccable Apache-2.0 and graphify lack them). No git tags. .gitignore:2 `knowledge/` also matches plugins/studio/knowledge/. Impeccable engine VERSION 0.1.16 vs skill 4.7.0.
