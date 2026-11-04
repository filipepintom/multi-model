---
slug: audit-distribution-pins
request: "F15 (rest): pin the Impeccable detector SHA-256 in the repo; verified modern-screenshot copyright."
phase: done
mode: fast
branch: studio/audit-distribution-pins (merged into main, 8fb609e)
started: 2026-11-03
---

# State — audit-distribution-pins

- Hashes: fetched from the engine-v0.1.16 release sidecars (5 assets). The darwin-arm64 value matches the binary cached on this Mac since before this work.
- modern-screenshot copyright: upstream LICENSE says "Copyright (c) 2021-present wxm" (MIT).
- Implementation 8fb609e: SHA256SUMS + both launchers + vendor.js + check-release.js + tests. Verify 83/83.
- End to end: a real download into an empty IMPECCABLE_HOME installs v4.7.0; a tampered pin is refused (checksum mismatch, rc 127).
- Review (sonnet): APPROVED. .cmd read as cmd.exe would; cannot fail open. Minor: duplicate entries resolve differently (last in .cmd, first in sh); windows-arm64 → x64 fallback untested.
- Not confirmed: the .cmd path on Windows; the 4 non-darwin-arm64 hashes against a real download.
- 2026-11-03: the 4 remaining hashes (darwin-x64, linux-arm64, linux-x64, windows-x64.exe) match real downloads of the engine-v0.1.16 assets. All 5 entries are now confirmed.
