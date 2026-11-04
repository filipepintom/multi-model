# Retro — audit-distribution-doctor

- 1 implementer, 1 review round, 0 retries.
- What went wrong: the red run only showed "cannot find module paths.js", so it proved nothing about behaviour; the reviewer had to rebuild the red run with the helper copied into main. Cause: the test file required the new module at the top.
- Lesson candidate (general): when tests import a module the change creates, prove red with that module stubbed or copied in, so the red run exercises the old behaviour.
