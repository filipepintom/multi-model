# Audit — <area>

<date> · scope: <what was audited> · lenses: <lenses>

## Summary

<3–5 sentences: the overall state, the biggest risk and what to do first.>

| Severity | Confirmed | Plausible |
|---|---|---|
| Critical | | |
| High | | |
| Medium | | |
| Low | | |

Refuted in verification: <n> of <total>. They were left out of the backlog; the reason for each is in `findings.json`.

## Backlog

| # | Id | Severity | Title | Location | Effort | Mode | Status |
|---|---|---|---|---|---|---|---|
| 1 | F1 | critical | <title> | `src/x.js:31` | S | full | to do |

### F1 — <title>

- **Where:** `src/x.js:31–36` (also `src/y.js:12`)
- **Scenario:** <input/state → steps → wrong result>
- **Impact:** <who is affected and how>
- **Evidence:**
  ```
  <code lines>
  ```
- **Verification:** <confirmed/plausible: what was run or traced>
- **Fix:** <incremental step>
- **Request for the build:** `/studio:build --skip-idea --<fast|full> "<request>"`

## Also observed

<One line per low-priority problem outside the backlog. Optional.>

## Baseline

<Summary of baseline.md: tests, coverage, lint, dependencies, hotspots.>

## Recommendations outside the backlog

<For example a deep security audit with /claude-security, or characterization tests on a critical module without tests.>
