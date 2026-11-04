# Delivery: audit-distribution-extras

- F18: `reverser-live` no longer has the raw gdb, rizin and cutter consoles.
- F7: graphify no longer trusts a `.graphify_python` that came with the repository. The interpreter is resolved again when:
  - the path is not absolute;
  - the file does not exist;
  - the name is not `python*`;
  - it sits inside the project, whether resolved or through a venv symlink;
  - it fails `import graphify` run from `/`.
- F7: `PYTHONSAFEPATH=1` on every interpreter call keeps the project folder off `sys.path` (Python 3.11+; 3.10 is not covered).
- F17: `knowledge.js` keeps the plugin lessons and Ponytail when the personal folder fails. When the context is too long it cuts personal lessons first, then preferences, and always produces valid JSON through a pipe.
- F15 (partial): the reviewer's fallback is pinned to `npx -y impeccable@4.7.0`. The detector binary hash is still checked against the release's own sidecar; embedding it needs network.
- F25 + M9: new `scripts/check-release.js`, which checks README versions against vendor.json, stray skill folders, the launcher's git mode and plugin.json. `vendor.js` and `vendor.json` are now in English.

How to check: `node --test "plugins/studio/**/*.test.js"` gives 78/78, and `node scripts/check-release.js` prints "release check ok".

Open:
- Windows and Git Bash were not run.
- A future re-vendor of graphify needs the PYTHONSAFEPATH and guard edits again. The tests will fail until that is done.
