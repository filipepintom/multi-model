# Review — audit-distribution-F16

Round 1 (opus): CHANGES REQUESTED. Important: the batch could exceed 4 options per question (updates, deletions and consolidation were uncapped), and "single change" was ambiguous. Minor: the confirmation sat before section 4; "one Edit per file" conflicted with Edit-needs-Read; CLAUDE.md writes stay unconfirmed (accepted residual risk).
Round 2 (b1155ed): APPROVED. 4-change cap per question including consolidation, overflow deferred and never written; per-question single-change rule (multiSelect false); new section 5 "Confirm and write" after sections 3–4; Edit-after-Read wording. Minor: "Lessons are proposals" → "Personal lessons are proposals" (fixed, 0457a34).
Adversarial checks clean: --auto claimed by file content only reduces writes; updated/replace paths covered; forged gate-1 decisions go through the batch; knowledge.js header comes before the lessons, so truncation cannot cut it; tests use temp dirs.
Verify after rebase onto main: 37/37.
Not confirmed: live agent behaviour (the SKILL.md asserts guard wording, not behaviour). Residual: instruction-level control; with setup's allow rule, a compromised retro can skip the batch.
