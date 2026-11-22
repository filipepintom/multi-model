# Emil Kowalski's skills: what was extracted

Source: https://github.com/emilkowalski/skills, commit `64eb3de` (2026-11-15), MIT. The three files here are paraphrased extractions of 18 of the 20 skills (`animate-expo` and `write-swift` are not about the web and were left out), made on 2026-11-21 by three Sonnet agents that read every file in full. The curves, durations and values were spot-checked against the clone; the rest was not.

| File | What it holds |
|---|---|
| [1-motion.md](1-motion.md) | Where motion goes, tokens, building rules, review standards, recipes, vocabulary |
| [2-interface-craft.md](2-interface-craft.md) | Principles, craft beyond motion, review standards, removing motion, the Apple-style rules |
| [3-robustness-phone-libraries.md](3-robustness-phone-libraries.md) | Worst-case data, a web app on a phone, gestures, toasts, library picks, variants behind a picker, learning the user's taste |

## What the plugin uses

Only the behaviour pass: `plugins/studio/skills/build/behaviour-pass.md` (motion criteria M1 to M7 and phone criteria P1 and P2). It runs after the screen is built and leaves the layout alone.

## What it does not use, and why

- **The same rules as spec criteria, before the screen exists.** Tested on eval 021 (`evals/ab/com-app-craft.js`): the behaviour was delivered, and the builds lost the capture jury 0 of 9 to the current studio. Cause not established.
- **Data limits and worst-case data** (file 3, section 1). The reviewer never edits files, so the fixture has to be built by an implementer. Not tested.
- **Apple-style materials and the system font** (file 2, section 6). They are a visual direction, and Impeccable's floor refuses glass as decoration and a system display face. Available as a direction the user asks for.
- **Library picks, Sonner, Vaul and gestures** (file 3, sections 3 to 5). React only; the app-screen eval is static HTML.
- **Variants behind a picker and taste learning** (file 3, sections 6 and 7). They need the human gates, and the evals run without them.

The skills have no rule for highlighting a changed value, loading states or optimistic updates.
