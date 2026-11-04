# Retro — audit-distribution-F16

- 1 implementer, 2 review rounds, 0 escalations; the critic cut one criterion and reshaped the confirmation before any code.
- What went wrong: the spec did not account for AskUserQuestion limits (2–4 options, ≤4 questions); the reviewer caught a 5-option batch. Cause: a UI tool limit not written in the spec.
- Lesson candidate (general): when a spec relies on AskUserQuestion, write its limits (2–4 options per question, ≤4 questions) into the criteria and say what happens to the overflow.
