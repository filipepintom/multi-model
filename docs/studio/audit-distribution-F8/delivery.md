# Delivery: audit-distribution-F8

## What changed
- `skills/impeccable/LICENSE` (Apache-2.0, Paul Bakaus) and `skills/graphify/LICENSE` (MIT, Safi Shamsi), copied byte for byte from local installs of each project.
- `THIRD_PARTY_NOTICES.md`, now in English: each row points to its licence file. graphify is redistributed under MIT. modern-screenshot has a new row with the MIT text.
- The studio's own licence: `LICENSE` at the repo root and in `plugins/studio/` (MIT, Copyright (c) 2026 Filipe Melo), plus `"license": "MIT"` in `plugin.json`.
- `scripts/vendor.js`: impeccable and graphify keep their licence when the source has none, and vendoring fails when there is none anywhere. It also stops before deleting anything when the source folder does not exist.
- Tests: `scripts/licences.test.js` and one more case in `vendor.test.js`.

## For you to confirm before publishing
- The MIT licence for the studio was chosen under the "finish everything" goal. Change both `LICENSE` files and `plugin.json` if you want a different licence.
- Check the exact modern-screenshot copyright line upstream (github.com/qq15725/modern-screenshot).

## How to check
`node --test "plugins/studio/**/*.test.js"` gives 29/29.
