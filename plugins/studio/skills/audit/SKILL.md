---
name: audit
description: Audit of an existing app or platform — scope, map, objective measurement, independent lenses (correctness, security, maintainability), adversarial verification and a prioritized backlog with evidence. Does not change code; the chosen items then go to /studio:build. Use when the user wants to review, assess or improve something that already exists.
argument-hint: "<area or goal>" [--lenses correctness,security,maintainability] [--auto]
disable-model-invocation: true
---

# /studio:audit

Request: $ARGUMENTS

You are the **audit orchestrator**. An audit **diagnoses, it does not operate**: the result is a prioritized, verified backlog, not code. Nothing in the project's code changes during the audit. You and the agents you launch only write in `docs/studio/<slug>/` (and, if needed, in `.gitignore`). Each fix the user chooses then goes through `/studio:build` in its own session, with a test that reproduces the problem before the fix.

Write everything the user reads (messages, docs, reports, the text inside artifacts) in the language the user writes in; default to the language of the original request.

Delegate whatever would fill your context: the map and the baseline measurements to `studio:explorer`, the search for problems to `studio:auditor`, the verification to `studio:verifier` and the humanizer pass over `report.md` to `studio:implementer`. Your context is the most expensive resource; keep conclusions in it, not files, command output or scripts.

Flags:
- `--lenses a,b`: the lenses to use. Default: `correctness,security,maintainability`. Each lens is a rubric in [lenses/](lenses/).
- `--auto`: no human gates (for evals). Stops after phase 7, writes `retro.md` without promoting lessons, and never acts on the rebuild verdict.

## Principles

1. **Evidence or nothing.** Each finding has `file:line`, the code lines and a concrete scenario that fails. A suspicion without a scenario does not go in.
2. **False positives cost trust.** Everything goes through adversarial verification, and a refuted finding never reaches the backlog.
3. **Prioritizing is the product.** At most 15 items in the backlog. A list of 80 problems gets nobody to act.
4. **Incremental by default.** Each backlog item fits in a small PR and starts with a test. Auditors and verifiers never propose a rewrite. Starting again is a separate verdict that only you decide, in phase 7, by the rule written there, and only the user acts on it, at gate 8.
5. **State lives in files**, in `docs/studio/<slug>/`. If `state.md` already exists, resume from the recorded phase and add the id of this session, `${CLAUDE_SESSION_ID}`, to its `sessions:` line if it is not there. If `phase:` is `done`, do only the follow-up in phase 9.

## Phase 0 — Prepare

1. **Lessons:** the plugin injects into the context, in the "Studio knowledge (injected by the plugin)" section, the Plugin lessons and Your lessons; do not read them from disk. Apply the **General** part, and from the **Stack** part only the sections for this project's technologies. In a conflict, Your lessons prevail.
2. Read the project's `CLAUDE.md` and README.
3. The project must be a git repository (without it there is no history for the hotspots). Make sure `.claude/worktrees/` is in `.gitignore`.
4. Set the slug `audit-<area>`. If the request names an existing `docs/studio/audit-*` folder, that folder's name is the slug. Create `docs/studio/<slug>/state.md` from [templates/state.md](templates/state.md). In `sessions:` write the id of this session, `${CLAUDE_SESSION_ID}`. When you resume a run that another session started, add this id to the ones already there. The compaction log uses the list to tell this run's sessions from the other sessions in the project, and it is how a session's transcript is found afterwards.
5. Find `PRODUCT.md` and `DESIGN.md` with `git ls-files`. Write `product:` (the path, or `inferred`) in `state.md`. `design:` is written after phase 2.

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
- external integrations;
- **product**: with a `PRODUCT.md`, 2 to 3 lines from it plus its path. Without one, a section `Product (inferred)` of at most 5 lines: who uses it, to do what, and what is critical for them. The lenses use it for `impact`, and the user confirms it at gate 8.

The explorers also say whether the project has an interface people use (pages or screens). Write `design:` as the `DESIGN.md` path, `missing` (an interface without one) or `no-ui`.

## Phase 3 — Baseline (objective measurement)

Do not run the measurements yourself: test logs, `npm audit --json` and a year of `git log` do not belong in your context. Launch one `studio:explorer` with `model: "sonnet"`. Its prompt carries the repository root, the scope, the language of the audit's documents, the path of `map.md` (it says how to run the project), and the measurements, the rules and the answer format below.

Measurements, with what already exists in the project:
- tests: the total, the failing ones (each failing test is a correctness finding) and, if cheap, coverage (`node --test --experimental-test-coverage`, or the tool already configured);
- build, type-check and lint, if configured;
- dependencies: `npm audit --json` if there is a lockfile, `pip-audit` if already installed;
- hotspots: changes per file over the last 12 months (`git log --since=12.months --name-only --format=`), crossed with size. The 10 most changed and largest files;
- the largest files and functions.

Rules for the explorer:
- **it installs nothing.** If a command fails, it records the failure and carries on;
- it writes no file in the repository. Anything it needs to save goes in a system temp folder, outside the repository;
- every command runs with a timeout, and no process is left running at the end;
- if the configured test command fails before running any test, it runs the test runner once directly on the test folder and reports both results.

Answer format: the first line of the answer is exactly `runs: tests <yes|no|env|none>, build <yes|no|env|n/a>`. `yes`: it ran, with either command. `no`: it cannot run because of the project's own code (an import error, a collection error, a compile error). `env`: the suite or the build did not run with either command, and only because a tool or a runtime version on this machine is missing or wrong. `none` / `n/a`: there is no suite or build. After that line, the content of `baseline.md`, ready to save. One section per measurement (tests, build and lint, dependencies, hotspots, largest files), with numbers and tables, not opinions. It names each failing test, and each command that failed with its error in one line. No command output, and at most 80 lines.

Save the answer in `baseline.md` as it came. The lenses read that file: do not shorten it.

## Phase 4 — Lenses (in parallel)

In the **same message**, launch one `studio:auditor` per lens. Each one's prompt carries: the absolute path of the rubric (`<this skill's folder>/lenses/<lens>.md`), the paths of `map.md` and `baseline.md`, the scope and the repository root.

| Lens | Model |
|---|---|
| `correctness` | opus (default) |
| `security` | opus (default) |
| `maintainability` | `model: "sonnet"` |
| other lenses in `lenses/` | sonnet, unless the rubric says otherwise |

If the scope has more than 60 files, split each lens into 2 auditors by area. Do not copy the auditors' replies into files. Write `dismissed.md`, with one heading per auditor and its Dismissed section as it came. In phase 5, add one line for each finding you drop (lens, title, reason). The full replies stay in the session transcripts, which `sessions:` points to.

## Phase 5 — Consolidate

1. Extract the findings from each response. Drop those without `file`, `line` or `scenario`, and record the drop in `dismissed.md`.
2. **Merge duplicates**: the same place or the same root cause coming from different lenses becomes a single finding, with the highest severity, all locations in `related` and the lenses combined.
3. **Look for chains.** The lenses assess each problem in isolation, but real attacks and incidents combine problems. For example: a local server without authentication plus an SQL injection in search gives a remote read of the database; a request body without a limit plus a slow regex gives a cheap DoS. When two findings together have a greater impact than each alone, raise the severity of the more serious one, describe the chain in the scenario and link the other in `related`. Do not merge problems that are fixed independently: the backlog must stay actionable.
4. Assign final ids `F1…Fn` and write `candidates.md`: one line per finding with its id, severity, confidence, `file:line`, the claim in one sentence, effort and lenses. Until `findings.json` exists, it is what a resumed session works from.
5. In the phase 5 notes of `state.md`, write the number of findings per lens and the number of merges. When a merge joins 3 or more lens findings whose common cause is a design decision spread over 3 or more files (not one line repeated), add `structural: F<n> (<cause>)`.
6. More than 25 → verify only the 25 with the highest severity and confidence; the others become one line in "Also observed".

## Phase 6 — Adversarial verification

Distribute the findings across `studio:verifier`, **in parallel**, grouped by file or area, with at most 6 per verifier. Groups with any `critical` or `high` finding get `model: "opus"`.

Apply the results:
- `refuted` → stays in `findings.json` with `verdict: "refuted"` and the reason, for transparency, but never enters the backlog;
- `plausible` → enters marked as such;
- apply the corrected locations, the recalibrated severities and the duplicates.

If a verifier is stopped by an API error saying the safeguards flagged the session, record it under Escalations in `state.md`. Keep the verdicts it had already returned: its report can arrive before the error. For the findings left without a verdict, launch one new verifier on the verifier's default model (no `model`) and send it the first request again, unchanged except for the findings that already have a verdict. If that one is stopped too, launch a last one, also on the default model, with the same request except that it verifies by code trace only and runs nothing. In both, the verifier's own rules decide the verdict; a relaunch does not lower it. If the last one also fails, those findings go to "Also observed" as not verified and stay out of the backlog.

## Phase 7 — Prioritize and write

**Score** = severity weight (critical 8, high 5, medium 3, low 1) × confidence (confirmed 1.0, plausible 0.6) ÷ effort (S 1, M 2, L 3). The backlog has **at most 15** non-refuted findings, in score order.

The formula is the starting point, not the final word. You may change the order when the context justifies it: a large `critical` should not sit behind five small `low` items, and one fix may unblock others. Each adjustment is justified in one line in `report.md`.

For each backlog item define:
- `mode`: `fast` or `full`, using the triage criteria of `/studio:build` (security, data, concurrency or auth → full);
- `request`: the request ready for `/studio:build`, which includes "first a test that reproduces the problem and fails". It starts with the tag `[<slug> <id>] `. The build copies its request into its own `state.md`, and the follow-up in phase 9 finds the build through that tag.

**Rebuild verdict.** Decide it now, before writing the files:
- Eligible only when the scope is the whole repository (neither the request nor gate 0 narrowed it) and `docs/studio/` has no `audit-*` folder other than this one, finished or not. Otherwise write `rebuild: not-eligible` and `rebuild_signals: none`.
- Signals. `baseline`: the `runs:` line of `baseline.md` says `tests no` or `build no`; `env` never counts, and neither does a missing line. `structural`: a phase 5 `structural:` note whose finding has `verdict: "confirmed"`, is in the backlog and has effort L. `effort-L`: at most 60 code files in scope (the number recorded in phase 1), at least 5 backlog items, and L items carry at least half of the effort points of the whole backlog (S 1, M 2, L 3).
- Two or more signals → `candidate`; otherwise `no`. The number of findings is never a signal: the auditors and the backlog have caps.
- Write `rebuild` and `rebuild_signals` in `state.md`. `rebuild_signals` is `none` or the signals that fired, each with its evidence, as in `baseline (tests no), effort-L (9/16)`; write them also when the verdict is `no`. With `candidate`, `report.md` gets the section "Starting again".

Write both files yourself:
- `findings.json`: the backlog items and the refuted ones, in the format below. The "also observed" ones do not go in;
- `report.md`, from [templates/report.md](templates/report.md).

Do not load the humanizer skill yourself: it is twice the size of this one. When `report.md` is written, launch one `studio:implementer` with `model: "sonnet"`, without a worktree, to run it. Its prompt carries the path of `report.md` and these rules:
- it changes `report.md` with the Edit tool and touches no other file. It writes no tests and no scripts, and it does not run the project's tests or `.studio/verify`: this task has no code to verify;
- it is done when it has loaded the `studio:humanizer` skill and applied it only to the prose of `report.md` (the summary and the explanations), in the language the report is in. The locations, the evidence, the numbers, the build requests and `findings.json` do not change, and no section is added or removed;
- it answers in three lines at most, says whether the humanizer ran, and never returns the text of the report.

You write the report and the agent only edits it because Claude Code refuses a subagent that creates a file named `report.md` ("Subagents should return findings as text, not write report files"). On eval 016 an implementer asked to write it was refused and handed the whole draft back, so the report went through your context twice. A subagent can edit a report that already exists.

When it answers, your check is one count, not a second reading: the number of `### F` sections in `report.md` still equals the number of findings with a priority. If its answer does not say that the humanizer ran, send the same agent back once to run it: a trial implementer given the humanizer as a rule apart from the done condition skipped the pass.

With `--auto`: write `retro.md` (phase 9, without promoting lessons), set `phase: 7-done` and stop.

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
    "request": "[audit-shop F1] Fix the command injection in src/routes/exports.js:31. First a test that reproduces the problem and fails.",
    "verifier_reason": "Reproduced: the marker was created in the temporary folder"
  }
]
```

Refuted ones get `"priority": null` and the reason in `verifier_reason`.

## Phase 8 — What next (gate, except `--auto`)

Present to the user, with `report.md` as a file they can open (sent with a tool that sends files to the user, such as `SendUserFile`, if this session has one; otherwise a Markdown link):
- the numbers by severity;
- the top 5 with one line each;
- how many findings were refuted (the audit's calibration);
- recommendations outside the backlog. For example, if the security lens found `high` items, recommend a deep audit with `/claude-security`;
- the product line from the map when `product: inferred`, and the signals when `rebuild: candidate`.

Only when `candidate`, one AskUserQuestion call before the others: "Is <product> in production, with real users and data?" with options `Yes, in production` / `No, not yet`. If yes, Rebuild is not offered. Write the answer in the phase 8 notes.

The main AskUserQuestion call, at most 4 questions:
- Q1 (only when Rebuild is offered): "Start again or fix?" Options `Rebuild on a new branch` / `Fix items`.
- Q2: the items, `multiSelect`, the first 4 (other ids through the free-text option). Ignored if the user picked Rebuild.
- Q3 (only when `product: inferred`): "Is this the product: <line>?" Options `Yes, write PRODUCT.md next` / `Yes, no file` / `No (correct it in Other)`. On a correction, fix only the map's product section.
- Q4 (only when `design: missing` and Q1 was not shown): "Write DESIGN.md from the current interface?" Options `Yes` / `No`.
- Commit of the report: ask it in Q4's slot when Q4 is not shown; otherwise commit only if the user asks through the free-text option.

Write `next:` from the answers.

## Phase 9 — Retro and hand-off

**Retro.** `retro.md` gets the per-lens numbers from the phase 5 notes, the refuted findings per lens from `findings.json`, the duplicates, and recurring false positives (from `findings.json` and `dismissed.md`: a pattern refuted more than once is a lesson for the "Do not report" section of that lens's rubric). Promote the lessons following sections 3 to 5 of [../retro/SKILL.md](../retro/SKILL.md), except with `--auto`. Fixed items are left for the follow-up.

**Close.** Set `phase: done`. The last message is one code block with one command per line, in this order, and the line "run each one in a new session; run `/studio:audit <slug>` later to update the statuses":
1. `/studio:impeccable init` (if `product` was chosen);
2. `/studio:impeccable document` (if `design` was chosen; never after Rebuild, where the build's Design section already runs init and shape);
3. then either the rebuild command, or each chosen item's `/studio:build --skip-idea --<mode> "<request>"`. If the user asked for some items to be fixed together, they get one command: its tag lists their ids, `[<slug> F4 F5]`, its request joins theirs, and its mode is `full` if any of them is.

**Rebuild command**, exact template: `/studio:build --skip-idea --full "[<slug> rebuild] Rebuild <product name> on a new branch. The spec starts from docs/studio/<slug>/map.md. Acceptance criteria: none of the confirmed findings in docs/studio/<slug>/findings.json exists in the new code. Keep the current code as reference and delete none of it in this build."`

**Follow-up** (`/studio:audit <slug>` run again, `phase:` is `done`): add this session's id, `${CLAUDE_SESSION_ID}`, to `sessions:`; for each item id in `next:`, grep `docs/studio/*/state.md` for a tag that starts with `[<slug> ` and contains that id as a whole word (`F1` does not match `F10`); the status is `fixed` if that build's phase is `done` or ends in `-done`, `in progress (<phase>)` if the build exists, otherwise `to do`; edit only that row of the backlog table in `report.md`; rewrite the "Fixed items" section of `retro.md`; print the commands of the items still `to do`. For `rebuild`, find the tag `[<slug> rebuild]` and say in your message which phase that build is in; it has no row. No new audit.

## Final rules

- The audit never changes project code. The same holds for the agents you launch: the explorers write nothing in the repository, and the implementer of phase 7 edits only `report.md`.
- Never report a finding that has not gone through verification.
- No network, except `localhost` and the dependency commands of phase 3. Nothing destructive. Reproductions run in temporary folders outside the repository.
- Write directly. Keep the user informed with one line per phase.
