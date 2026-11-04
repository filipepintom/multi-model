# Review — audit-distribution-doctor

VERDICT: APPROVED (sonnet). Verify 43/43. In a worktree of main with the new test and paths.js copied in, 5 behavioural tests fail (fresh install, studio@marketplace folder, duplicates, REA, pipx/pip). knowledge.js still fails open (bad stdin, throwing helper, unwritable folder) and resolves $CLAUDE_PLUGIN_DATA/knowledge as before. Tests use a temp HOME/CLAUDE_CONFIG_DIR, stub PATH and fetch stub.

Minor:
- setup/SKILL.md did not cover the new duplicate kinds (graphify/context7 plugins, context7 MCP). Fixed in 250ed35.
- doctor accepts `<python> -m pip` for a Python below 3.10 (the Python row already warns).
- paths.js builds the folder name from the raw marketplace string (comes from Claude Code's own file).
Not confirmed: Windows paths (tests skipped on win32).
