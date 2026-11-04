# Spec — audit-distribution-F8 (fast)

## Goal
Every third-party component the plugin ships travels with its licence text, and studio's own code has an explicit licence.

## Sources available offline (verified on this machine)
- Impeccable Apache-2.0 full text with "Copyright 2025 Paul Bakaus" appendix: ~/.npm/_npx/1a4eb60c8f6b0f89/node_modules/impeccable/LICENSE (npm package 3.4.0, same project). That package has no NOTICE file.
- graphify MIT text, "Copyright (c) 2026 Safi Shamsi": ~/.local/share/uv/tools/graphifyy/lib/python3.13/site-packages/graphifyy-0.9.6.dist-info/licenses/LICENSE. graphify is "MIT OR Apache-2.0"; studio redistributes it under MIT.
- modern-screenshot (bundled as skills/impeccable/scripts/modern-screenshot.umd.js): MIT, upstream github.com/qq15725/modern-screenshot. Exact copyright line not verifiable offline.

## Acceptance criteria
1. `plugins/studio/skills/impeccable/LICENSE` = the Impeccable Apache-2.0 text above; `plugins/studio/skills/graphify/LICENSE` = the graphify MIT text above.
2. `THIRD_PARTY_NOTICES.md` (translate the file to English while editing it; keep the same table): every vendored skill row points to its LICENSE file; graphify row says redistributed under MIT; a new row for modern-screenshot (MIT, upstream URL, bundled inside skills/impeccable/scripts) with the MIT licence text inline and a copyright line "Copyright (c) qq15725 and modern-screenshot contributors" plus a note that the exact upstream line should be checked before release.
3. Studio's own licence: root `LICENSE` and `plugins/studio/LICENSE` with the MIT text, "Copyright (c) 2026 Filipe Melo" (author in plugin.json); `"license": "MIT"` in plugins/studio/.claude-plugin/plugin.json. (Decision taken under the user's "finish all tasks" goal; flagged in delivery for confirmation.)
4. `scripts/vendor.js`: the impeccable and graphify branches copy `LICENSE` (and `NOTICE` if present) from the source folder like the other branches do, and fail with a clear message if the source has no LICENSE and the destination has none either. vendor.json license fields unchanged.
5. Test (node:test under plugins/studio so `.studio/verify` runs it): every key in vendor.json maps to a skill folder containing a LICENSE file (context7 → context7-mcp); THIRD_PARTY_NOTICES.md mentions modern-screenshot; plugin.json has a license field; plugins/studio/LICENSE exists. Fails on current main.
6. `claude plugin validate plugins/studio` passes; `.studio/verify` green.

## Out of scope
Translating vendor.json notes (they are rewritten by vendor.js; translate the vendor.js note strings only if trivial).

## Task
T1 (tier haiku/sonnet): test first, then files and vendor.js.
