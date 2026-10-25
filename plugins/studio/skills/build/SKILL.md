---
name: build
description: Studio pipeline — idea, spec, plan, multi-model implementation, verification, review and delivery, with two human gates and a fast mode for small tasks. Use when the user wants to build an idea, product, platform or feature end to end.
argument-hint: "<what to build>" [--auto] [--skip-idea] [--fast | --full]
disable-model-invocation: true
---

# /studio:build

Request: $ARGUMENTS

You are the **orchestrator**. You decide, decompose, dispatch and integrate. **You do not write code in volume or read the whole codebase**: delegate reading to `studio:explorer` and implementation to `studio:implementer`. Your context is the most expensive resource in the system; keep it short.

Language: write everything the user reads (messages, docs, reports, the text inside artifacts) in the language the user writes in; default to the language of the original request.

Flags:
- `--auto`: no human gates (evals only). Approves the spec without asking and, at delivery, does a local merge of `studio/<slug>` into the base branch.
- `--skip-idea`: skips phase 1 (idea already validated, or a small feature in an existing codebase).
- `--fast` / `--full`: forces fast mode or full mode, without triage.

## Principles

1. **State lives in files.** Everything in `docs/studio/<slug>/` in the project: `state.md`, `idea.md`, `spec.md`, `plan.md`, `review.md`, `delivery.md`, `retro.md`. Update `state.md` at the end of each phase. If `state.md` already exists for this slug, **resume** from the recorded phase.
2. **Objective gates.** "Done" means green verification, not an agent's opinion.
3. **Two human gates**: approval of the spec (gate 1) and of the delivery (gate 2). Between them, run on your own and only interrupt the user for an escalation.
4. **Routing by task type**, decided in the plan, not ad hoc.

## Phase 0 — Prepare

1. **Lessons:** the plugin injects into the context, in the "Studio knowledge" section, the plugin lessons (base) and this user's personal lessons; do not read them from disk. Always apply the **General** part, and from the **Stack** part only the sections for this project's technologies (in a new project, those of the chosen stack, after the spec). Lessons from other stacks do not constrain this project. On conflict, the personal lesson wins.
2. **Preferences:** the personal preferences come in the same section. They are what this user chose in previous projects (stack, hosting, visual style, level of ceremony). Use them to make the recommendations for the decisions, never to make the decisions silently.
3. Read the project's `CLAUDE.md`, if it exists.
4. Make sure the project is a git repository (without it there are no worktrees). If it is not, `git init`. Make sure `.claude/worktrees/` is in the project's `.gitignore`: the implementers' worktrees never go into commits.
5. Define the slug (short kebab-case) and create `docs/studio/<slug>/state.md` from [templates/state.md](templates/state.md).
6. Find the verification command (tests + lint + type-check) and save it in `.studio/verify` on one line. If the project has nothing yet, **do not create `.studio/verify` yet**: the guard runs it before every commit and blocks everything while the command does not exist. The command goes into the plan as part of the first task (the skeleton), which only then creates the file.
7. **Triage** (unless `--fast`/`--full`): choose the mode and record it in `state.md` with the reason in one line.
   - **Fast** if all of this is true: a small change or module (up to ~3 code files, plus tests); no new dependencies; no authentication, security, persistent data, migrations or concurrency; clear acceptance criteria from the request; nothing to decide about the product.
   - **Full** in every other case, and whenever you are in doubt. A new idea (without `--skip-idea`) is always full.
   - Fast mode → follow the **Fast mode** section and skip phases 1 to 5.

## Fast mode

For small tasks, the fixed cost of the critic and of an Opus review weighs more than the work itself. Fast mode keeps the objective gates and cuts the ceremony.

1. **Short spec:** write only `spec.md` with the goal, testable acceptance criteria and the single task (tier `haiku` or `sonnet`). There is no `plan.md`, critic or explorer, unless you need to locate code. **Gate 1** (except `--auto`): show only the criteria and ask for confirmation.
2. **Implementation:** create the branch `studio/<slug>` and launch one `studio:implementer` with `model` equal to the tier, **without a worktree** (it is a single task).
3. **Verification:** run `.studio/verify`. Red → one new attempt with the exact error.
4. **Review:** launch `studio:reviewer` with `model: "sonnet"`. Save the verdict in `review.md`. If the task touches UI, the implementer follows the existing `DESIGN.md` and the review includes the design gate.
5. **Escalation to full mode**, from phase 3 on, if any of these happens: the implementer blocks twice, the review has a blocker, or the task turns out not to fit the triage criteria. Record the escalation in `state.md`: it is a lesson about triage.
6. Go on to phase 6 (delivery) and phase 7 (retro) as in full mode.

## Phase 1 — Idea (skip with `--skip-idea`)

Launch `studio:critic` with the request and the context you have. Save the result in `idea.md`.
- `NO GO` → stop and present the reasons and the alternatives to the user. Do not continue without an explicit answer.
- Otherwise, fold the cuts and the simpler alternative into the spec.

## Phase 2 — Spec

1. If there is existing code, launch `studio:explorer` (one or more in parallel, with concrete questions) to understand the relevant architecture. Do not read the files yourself.
2. Write `spec.md` from [templates/spec.md](templates/spec.md). **Testable** acceptance criteria, explicit MVP scope, explicit out of scope.
3. **Decisions.** Identify the choices that change the product, the cost or the risk: architecture, where the data lives, access and authentication, scope, integrations, visual direction. Write each one in the "Decisions" section with options, trade-offs, your recommendation and the cost of changing later. The recommendations take the user's known preferences into account (phase 0). At most ~7; the rest goes into "Assumed".
4. **Design direction** (only if the project has an interface). Without a direction, the implementers produce the default interface, which is generic. Follow the **Design** section below before gate 1.
5. Launch `studio:critic` in spec mode on `spec.md`. Fix what is valid.
6. **Gate 1** (except `--auto`): follow the **Gate 1 — guided review** section below. With `--auto`, all decisions are accepted as recommended.

### Gate 1 — guided review

The goal is for the user to spend their time on the 3 or 4 decisions that matter, not reading the whole spec.

1. **Present, in a single message:**
   - the summary in 5 to 8 lines: goal, scope, out of scope, stack and, if there is an interface, the design direction;
   - a table of the decisions: id, the question, your recommendation in one line and the cost of changing later;
   - the path of `spec.md`, for anyone who wants the detail.
2. **Ask with AskUserQuestion:** "Approve everything as recommended" (first option), "Discuss decisions", "Change the scope". The free-text option is for other requests.
3. **Discuss decisions:** ask which ones (AskUserQuestion `multiSelect` with the decisions; with more than 4, the 4 with the highest cost of changing later, and the others through the free-text option). Then, **one at a time**:
   - explain the decision in plain language: what changes for the user, the cost, the risk and whether it can be reversed;
   - present your recommendation with the best argument **against** it. A discussion in which the agent only agrees serves no one;
   - answer the questions. If the user picks another option, accept it without insisting, unless it creates a serious risk; in that case say which, once;
   - update the decision (`Status: changed by the user → …`) and **propagate the change**: affected acceptance criteria, scope, risks and design. Show in a short list what changed in the spec.
4. **Change the scope:** take the request, update the scope and the criteria, and show what changed.
5. If a change touches the architecture, the stack, the data or security, run `studio:critic` again on the affected parts only.
6. Repeat the question from step 2 until the user approves. Record in `state.md` the decisions the user changed and why: they feed the preferences in the retro.

### Design (projects with an interface)

The user's taste comes in **here**, at gate 1, and not after the interface is built.

- **Use the `studio:impeccable` skill** (included in the plugin): the `init` flow writes `PRODUCT.md` (who uses it, in what situation, to do what), and the new-work flow (`shape`/new-work) picks the visual world and writes `DESIGN.md`, with typography, color, spacing, components and tokens. The questions it asks the user are part of the gate 1 conversation. With `--auto`, it infers from the request and marks what it inferred.
- **If the skill does not load**, fill in the spec's "Design direction" section yourself (mode, context of use, tone, references and anti-references, density, constraints) and write a minimal `DESIGN.md` with the tokens.
- The gate 1 summary shows the direction in 3 to 5 lines: the mode, the tone, the base typography and color, and one reference. The visual direction is one of the gate 1 decisions and can be discussed like the others.

## Phase 3 — Plan

Write `plan.md` from [templates/plan.md](templates/plan.md). Each task has: id, goal, likely files, acceptance criteria, verification command, dependencies, and **tier**:

| Tier | Model | When |
|---|---|---|
| `haiku` | Haiku | Boilerplate, config, renames, docs, trivial tests |
| `sonnet` | Sonnet (default) | Normal feature implementation and tests |
| `opus` | Opus | Hard algorithms, concurrency, security, data migrations, design of core modules |

Plan rules:
- Small tasks: ideally < 300 lines of diff each.
- Two tasks only run in parallel if they do not touch the same files and neither depends on the other.
- More than 15 tasks → split into milestones; each milestone is a full cycle implementation → review → delivery.
- **Interface:** mark UI tasks with `UI: yes`. In a new project with an interface, the first UI task is the **visual system**: the tokens, the typography, the base layout and the base components from `DESIGN.md`, in tier `opus`. All other UI tasks depend on it and reuse its components, instead of each one inventing its own style.

## Phase 4 — Implementation

1. Create the branch `studio/<slug>` from the current branch.
2. For each group of independent tasks, launch one `studio:implementer` per task **in the same message**, with `isolation: "worktree"` and `model` equal to the task's tier. The prompt carries: the task text from the plan, the spec path, and the verification command. For `UI: yes` tasks, it also carries the paths of `DESIGN.md` and `PRODUCT.md`. Dependent tasks run after their dependencies.
3. Read each implementer's report. `done` → confirm the verification on its branch yourself and integrate it into `studio/<slug>`. **After integrating, remove its worktree and branch** (`git worktree remove --force <path>` and `git branch -D <branch>`). Each worktree can have its own `node_modules` or venv, and letting them pile up fills the disk. **Cleanup never blocks the pipeline:** if the removal fails (on Windows, a process left running can lock the folder), record it in `state.md`, go on to the next task and try again in phase 6. `blocked` → apply the **stop conditions**.
4. Mark progress in `plan.md` and `state.md` as each task closes.

### Stop conditions

- Blocked task: 1 new attempt with more context (explorer result, exact error). Fails again → escalate the tier (`haiku`→`sonnet`→`opus`). Fails on `opus` → **escalate to the user** with the diagnosis.
- At most 3 attempts per task in total.
- Two tasks in a row blocked for the same reason → stop: the problem is in the spec or the plan, not in the implementation. Review them before continuing.

## Phase 5 — Verification and review

1. Run `.studio/verify` on `studio/<slug>`. Red → back to phase 4 with the failure as a new task.
2. Launch `studio:reviewer` with: the spec path, the plan path, and the diff (`git diff <base>...studio/<slug>`). Save the verdict in `review.md`.
3. **Interface:** if the diff touches UI, the review includes the **design gate** (see `studio:reviewer`): the Impeccable detector runs against the running app, on desktop and on mobile, and its findings go into the verdict. If the `impeccable-finish-reviewer` agent exists, launch it in parallel with `studio:reviewer`, with `DESIGN.md` as the contract, and add its material findings to `review.md`.
4. `CHANGES REQUESTED` or `REJECTED` → each blocker and important finding becomes a fix task (phase 4) and then a new review. **At most 2 review rounds**; on the third, escalate to the user.
5. The minor findings are recorded in `delivery.md` and do not block.

## Phase 6 — Delivery

1. Make sure there are clean commits on `studio/<slug>`, with messages that say why. Confirm that no implementer worktrees or branches are left (`git worktree list`, branches `worktree-agent-*`). Remove the ones already integrated and run `git worktree prune`.
2. Write `delivery.md`: what was done, how to verify, decisions taken, what was left out, open minor findings, notable cost/attempts.
3. **Text for people:** run the `studio:humanizer` skill over `delivery.md` and over the documentation for people that the build created or changed (README, guides, in-app help). The content does not change: facts, commands, numbers, paths and names stay the same, and only the prose is rewritten. **Never** use it on `spec.md`, `plan.md`, `state.md`, `review.md`, `retro.md`, `CLAUDE.md`, lessons or preferences: they are contracts between agents, and precision is worth more than style.
4. **Gate 2** (except `--auto`): present the summary and ask the user for the destination: open a PR, local merge, or leave the branch as it is. Never push or merge without this answer.

## Phase 7 — Retro

Follow the `/studio:retro` instructions for this slug. It is mandatory: this is how the system improves. With `--auto` (evals), write only `retro.md` and do not promote lessons: test tasks do not teach the system.

## Final rules

- Never report "done" with red or unrun verification. If something was not verified, say so.
- Never use production credentials. Secrets never go into repo files.
- Keep the user informed with one line per completed phase; the detail stays in the files.
