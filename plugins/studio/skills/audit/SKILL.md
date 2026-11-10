---
name: audit
description: Audit of an existing app or platform — scope, map, objective measurement, independent lenses (correctness, security, maintainability), adversarial verification and a prioritized backlog with evidence. Does not change code; the chosen items then go to /studio:build. Use when the user wants to review, assess or improve something that already exists.
argument-hint: "<area or goal>" [--lenses correctness,security,maintainability] [--auto]
disable-model-invocation: true
---

# /studio:audit

Request: $ARGUMENTS

You are the **audit orchestrator**. An audit **diagnoses, it does not operate**: the result is a prioritized, verified backlog, not code. Nothing in the project's code changes during the audit. You only write in `docs/studio/<slug>/` (and, if needed, in `.gitignore`). Each fix the user chooses then goes through `/studio:build`, with a test that reproduces the problem before the fix.

Write everything the user reads (messages, docs, reports, the text inside artifacts) in the language the user writes in; default to the language of the original request.

Delegate code reading: the map to `studio:explorer`, the search for problems to `studio:auditor` and the verification to `studio:verifier`. Your context is the most expensive resource; keep conclusions in it, not files.

Flags:
- `--lenses a,b`: the lenses to use. Default: `correctness,security,maintainability`. Each lens is a rubric in [lenses/](lenses/).
- `--auto`: no human gates (for evals). Stops after phase 7 and does not run fixes.

## Principles

1. **Evidence or nothing.** Each finding has `file:line`, the code lines and a concrete scenario that fails. A suspicion without a scenario does not go in.
2. **False positives cost trust.** Everything goes through adversarial verification, and a refuted finding never reaches the backlog.
3. **Prioritizing is the product.** At most 15 items in the backlog. A list of 80 problems gets nobody to act.
4. **Incremental.** Each fix fits in a small PR and starts with a test. Never recommend rewrites.
5. **State lives in files**, in `docs/studio/<slug>/`. If `state.md` already exists, resume from the recorded phase.

## Phase 0 — Prepare

1. **Lessons:** the plugin injects into the context, in the "Studio knowledge (injected by the plugin)" section, the Plugin lessons and Your lessons; do not read them from disk. Apply the **General** part, and from the **Stack** part only the sections for this project's technologies. In a conflict, Your lessons prevail.
2. Read the project's `CLAUDE.md` and README.
3. The project must be a git repository (without it there is no history for the hotspots). Make sure `.claude/worktrees/` is in `.gitignore`.
4. Set the slug `audit-<area>` and create `docs/studio/<slug>/state.md` from [templates/state.md](templates/state.md).

## Phase 1 — Scope

1. From the request, define: the area (the whole repository or specific modules), the lenses, what is out of scope and what worries the user most, if they say so.
2. Count the code files in scope with `git ls-files`, excluding tests, vendor, generated files and docs.
3. More than 150 files with no area defined → **gate 0** (except `--auto`): propose 2 to 4 areas (the top-level modules) to the user with AskUserQuestion. An audit without a scope is expensive and shallow.
4. Record the scope in `state.md`.

## Phase 2 — Map

Launch `studio:explorer` (several in parallel, by groups of modules, if the scope is large) with concrete questions. If `graphify-out/` exists, the explorers start there. Write `map.md` (at most ~150 lines) with:
- stack and how to run it;
- components and responsibilities;
- **entry points**: routes, commands and jobs, with `file:line`;
- **trust boundaries**: where external input comes in (requests, files, arguments, external services);
- storage: where and how state is written;
- **critical paths**: money, authentication and permissions, personal data, persistent writes;
- external integrations.

## Phase 3 — Baseline (objective measurement)

Run what already exists yourself. **Do not install anything.** If a command fails, record the failure and carry on.
- tests: the total, the failing ones (each failing test is a correctness finding) and, if cheap, coverage (`node --test --experimental-test-coverage`, or the tool already configured);
- build, type-check and lint, if configured;
- dependencies: `npm audit --json` if there is a lockfile, `pip-audit` if already installed;
- hotspots: changes per file over the last 12 months (`git log --since=12.months --name-only --format=`), crossed with size. The 10 most changed and largest files;
- the largest files and functions.

Write `baseline.md` with numbers, not opinions.

## Phase 4 — Lenses (in parallel)

In the **same message**, launch one `studio:auditor` per lens. Each one's prompt carries: the absolute path of the rubric (`<this skill's folder>/lenses/<lens>.md`), the paths of `map.md` and `baseline.md`, the scope and the repository root.

| Lens | Model |
|---|---|
| `correctness` | opus (default) |
| `security` | opus (default) |
| `maintainability` | `model: "sonnet"` |
| other lenses in `lenses/` | sonnet, unless the rubric says otherwise |

If the scope has more than 60 files, split each lens into 2 auditors by area. Save each auditor's raw response in `docs/studio/<slug>/raw/<lens>.md`.

## Phase 5 — Consolidate

1. Extract the findings from each response. Drop those without `file`, `line` or `scenario`.
2. **Merge duplicates**: the same place or the same root cause coming from different lenses becomes a single finding, with the highest severity, all locations in `related` and the lenses combined.
3. **Look for chains.** The lenses assess each problem in isolation, but real attacks and incidents combine problems. For example: a local server without authentication plus an SQL injection in search gives a remote read of the database; a request body without a limit plus a slow regex gives a cheap DoS. When two findings together have a greater impact than each alone, raise the severity of the more serious one, describe the chain in the scenario and link the other in `related`. Do not merge problems that are fixed independently: the backlog must stay actionable.
4. Assign final ids `F1…Fn`.
5. More than 25 → verify only the 25 with the highest severity and confidence; the others become one line in "Also observed".

## Phase 6 — Adversarial verification

Distribute the findings across `studio:verifier`, **in parallel**, grouped by file or area, with at most 6 per verifier. Groups with any `critical` or `high` finding get `model: "opus"`.

Apply the results:
- `refuted` → stays in `findings.json` with `verdict: "refuted"` and the reason, for transparency, but never enters the backlog;
- `plausible` → enters marked as such;
- apply the corrected locations, the recalibrated severities and the duplicates.

## Phase 7 — Prioritize and write

**Score** = severity weight (critical 8, high 5, medium 3, low 1) × confidence (confirmed 1.0, plausible 0.6) ÷ effort (S 1, M 2, L 3). The backlog has **at most 15** non-refuted findings, in score order.

The formula is the starting point, not the final word. You may change the order when the context justifies it: a large `critical` should not sit behind five small `low` items, and one fix may unblock others. Each adjustment is justified in one line in `report.md`.

For each backlog item define:
- `mode`: `fast` or `full`, using the triage criteria of `/studio:build` (security, data, concurrency or auth → full);
- `request`: the request ready for `/studio:build`, which includes "first a test that reproduces the problem and fails".

Write:
- `findings.json`: the backlog items and the refuted ones, in the format below. The "also observed" ones do not go in;
- `report.md`, from [templates/report.md](templates/report.md). Run the `studio:humanizer` skill only over the prose of `report.md` (the summary and the explanations). The locations, the evidence, the numbers and `findings.json` do not change.

### `findings.json` format

```json
[
  {
    "id": "F1",
    "lens": "security",
    "title": "Command injection in the export",
    "severity": "critical",
    "confidence": "high",
    "verdict": "confirmed",
    "file": "src/routes/exports.js",
    "line": 31,
    "end_line": 36,
    "related": [],
    "evidence": "exec(`tar -czf exports/${name}.tgz data/`)",
    "scenario": "GET /export?name=x;touch%20/tmp/p → the command runs touch",
    "impact": "Remote command execution by any authenticated user",
    "fix": "Validate name against [a-z0-9-]+ and use execFile with arguments",
    "effort": "S",
    "mode": "full",
    "priority": 1,
    "request": "Fix the command injection in src/routes/exports.js:31. First a test that reproduces the problem and fails.",
    "verifier_reason": "Reproduced: the marker was created in the temporary folder"
  }
]
```

Refuted ones get `"priority": null` and the reason in `verifier_reason`.

## Phase 8 — Gate (except `--auto`)

Present to the user:
- the numbers by severity;
- the top 5 with one line each;
- how many findings were refuted (the audit's calibration);
- recommendations outside the backlog. For example, if the security lens found `high` items, recommend a deep audit with `/claude-security`.

Ask which items go ahead to be fixed, with AskUserQuestion `multiSelect` with the first 4 (the user may name other ids). Also ask whether to commit the report. With `--auto`, stop here.

## Phase 9 — Running the chosen items

For each item, in priority order, read [../build/SKILL.md](../build/SKILL.md) and follow it with the item's `request`, `--skip-idea` and the item's `mode` as `--fast` or `--full`. Additional rules:
- the first task is **always** a test that reproduces the problem and **fails** before the fix. In a maintainability refactor, these are characterization tests that pin the current behavior;
- one branch per item: `studio/<slug>-<id>`;
- each build's gate 2 stays;
- update the item's status in `report.md`: fixed, or blocked and why.

## Phase 10 — Retro

Write `retro.md` with:
- numbers: findings per lens; refuted per lens, which measure each lens's noise; duplicates across lenses;
- fixed items;
- **recurring false positives:** if a pattern was refuted more than once, it is a lesson for the "Do not report" section of that lens's rubric.

Promote the lessons following sections 3 to 5 of [../retro/SKILL.md](../retro/SKILL.md), except with `--auto`.

## Final rules

- Never change project code during phases 0 to 8.
- Never report a finding that has not gone through verification.
- No network, except `localhost` and the dependency commands of phase 3. Nothing destructive. Reproductions run in temporary folders outside the repository.
- Write directly. Keep the user informed with one line per phase.
