# Retro — audit-distribution-guard

- Tasks: 2 planned (T1 opus, T2 sonnet) + 3 fix rounds; 0 blocked; 3 review rounds (one over the limit, recorded in state.md).
- What went wrong: (1) fixing a false positive (outer assignments) opened a false negative (unexported variables); caught by an automated security review, not by our reviewer. (2) Adding F9/F10/F19/F20 to a branch under review created the verify re-entry bug. Causes: each rule change in a guard trades false positives against misses, and new scope landed mid-review.
- Lessons candidates: for guard rules, every pass test that relaxes a rule needs a paired blocked test for the nearest unsafe variant; do not add scope to a branch that is in review.
