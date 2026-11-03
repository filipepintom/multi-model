# Studio: a multi-model build and audit pipeline for Claude Code

`studio` is a Claude Code plugin that takes an idea all the way to a tested delivery, and audits code that already exists. Opus orchestrates; Sonnet and Haiku do the bulk of the work. You approve twice (the spec and the delivery); deterministic guardrails and independent reviews cover the rest.

The plugin's prompts are in English. Everything you read (questions, specs, reports, delivery notes) is written in the language you use when you talk to it.

```
/studio:build "Room booking platform with Microsoft login"
/studio:audit "payments module"
```

## Install

### Prerequisites

| | Required | Notes |
|---|---|---|
| Claude Code | yes | CLI or desktop app, with access to Opus (the orchestrator) |
| Node.js 18+ | yes | The plugin's hooks run on Node |
| git | yes | Builds use branches and worktrees |
| Python 3.10+ with uv or pip | no | Only for `/studio:graphify` (it needs bash: Git Bash on Windows) |
| [REA](https://github.com/morluto/rea), registered as the MCP server `rea` | no | Only for `/studio:reverse`. Native binaries also need Hopper, Ghidra, IDA or Kuna; Android needs JADX and Java; JavaScript and Electron apps need nothing else |
| Network access to `mcp.context7.com` | no | Up-to-date library docs; without it agents use their own knowledge |

### Steps

1. Add the marketplace (this repository) and install the plugin:

   ```bash
   claude plugin marketplace add <git-url-of-this-repo>
   ```

   ```bash
   claude plugin install studio@studio-local
   ```

2. Open Claude Code and run the setup check:

   ```
   /studio:setup
   ```

   It checks Node, git, Python, the design detector and Context7, finds duplicate installs, and offers to fix what it can. Every change needs your OK and can be undone: it moves files instead of deleting them, and backs up settings before editing them. Run `/studio:setup --check` to see the report without changing anything.

3. In a project folder, with the main session on **Opus**, run `/studio:build "<your idea>"` or `/studio:audit "<area>"`.

### What to expect on first use

- The Impeccable design detector downloads its binary for your OS (about 20 MB) on its first run.
- `/studio:graphify` installs its Python package (`graphifyy`) the first time you call it.
- Your personal lessons folder is created on the first `/studio:build`, `/studio:audit` or `/studio:retro`. Unless you let `/studio:setup` add an allow rule, the first retro asks once before it writes there.

### Update and uninstall

```bash
claude plugin marketplace update studio-local
```

```bash
claude plugin update studio@studio-local
```

To uninstall: `claude plugin uninstall studio@studio-local`. Your personal lessons stay in the plugin data folder (see [Knowledge](#knowledge)) until you delete them.

### Cost and data

- **Cost:** a small task in fast mode is about 0.6–1 USD; a typical feature 2–5 USD; a greenfield app with UI 5–10 USD; an audit of ~1,000 lines about 5 USD.
- **Data:** code goes to Anthropic, as with any Claude Code session under your organisation's plan. Context7 receives only library names and documentation queries, never code. The Impeccable detector runs locally, with telemetry turned off by the plugin's hooks.

## Usage

### Build: `/studio:build "<idea>"`

Idea (critic) → Spec (**gate 1**) → Plan with model tiers → Parallel implementation in worktrees → Verification + independent review → Delivery (**gate 2**) → Retro

- **Triage.** Small, low-risk changes take the **fast mode**: no critic, no separate plan, review on Sonnet. Anything with auth, data, concurrency or product decisions takes the full pipeline. `--fast` and `--full` force a mode.
- **Gate 1 is a guided review.** The spec lists up to ~7 **decisions** that change the product, cost or risk. Each has options, trade-offs, a recommendation and the cost of changing it later. Approve all as recommended, or pick decisions to discuss one at a time. The agent argues for its recommendation and also gives the strongest case against it. Changes propagate through the spec, and the ones that go against a recommendation feed your personal preferences.
- **Design.** Projects with a UI get a design step before gate 1: Impeccable writes `PRODUCT.md` and `DESIGN.md`, and you approve the visual direction. The visual system is the first UI task, implementers follow `DESIGN.md`, and the review runs the design detector on the running app at desktop and mobile sizes. The detector catches anti-patterns; it doesn't measure taste. The direction you approve at gate 1 is what makes the difference.
- **Less code.** Ponytail's "smallest change that fully solves the task" rules are injected into every studio agent. Measured on the evals: 58% less code and 43% lower cost, at the same pass rate.
- **Human-facing text** (`delivery.md`, READMEs, user docs) goes through Humanizer. Specs, plans and other files that agents read as contracts never do.
- Other flags: `--skip-idea` (skip the critic's idea phase) and `--auto` (no gates, for evals only).

Each project gets `docs/studio/<slug>/` (state, spec, plan, review, delivery, retro) and `.studio/verify` (its verification command). An interrupted build resumes from `state.md`.

### Audit: `/studio:audit "<area>"`

Scope → Map → Objective baseline (tests, lint, dependencies, hotspots) → Independent lenses in parallel (correctness, security, maintainability) → Adversarial verification → Backlog of at most 15 items (**gate**) → each chosen item goes to `/studio:build`, starting with a test that reproduces the problem.

The audit never changes code. Every finding needs `file:line`, the code and a concrete failing scenario. A verifier tries to refute each one, and refuted findings never reach the backlog. To add a lens, add one file to `plugins/studio/skills/audit/lenses/`.

### Other commands

| Command | What it does |
|---|---|
| `/studio:retro [slug]` | Turns a build's failures into personal lessons and preferences. Runs automatically at the end of every build |
| `/studio:graphify [path]` | Builds a knowledge graph of a codebase; studio agents use it whenever `graphify-out/` exists |
| `/studio:reverse <target> <question>` | Explains how a feature of a shipped app works with REA (native, .NET, JavaScript/Electron, Android, firmware, WASM, captures, SQLite), and saves a report with evidence that `/studio:build` can use. `--compare <older>` finds behavior changes between versions; `--verify <build>` checks a reconstruction against the original. Static by default; `--runtime` lets it observe or drive the app (browser, Electron, process, Frida, adb) after you approve the exact run list. Only for software you own or have the right to analyze |
| `/studio:setup [--check]` | Checks and prepares the machine |

## What's inside

| Path | What it is |
|---|---|
| `plugins/studio/agents/` | `critic` (Opus), `explorer` (Haiku), `implementer` (Sonnet), `reviewer` (Opus), `auditor` (Opus; Sonnet for maintainability), `verifier` (Sonnet; Opus for critical/high), `reverser` and `reverser-live` (Sonnet) |
| `plugins/studio/skills/build/`, `audit/`, `reverse/`, `retro/`, `setup/` | The studio's own commands and their templates |
| `plugins/studio/skills/impeccable/`, `ponytail/`, `graphify/`, `humanizer/`, `context7-mcp/` | Bundled third-party skills (see [Bundled skills](#bundled-skills)) |
| `plugins/studio/hooks/` | Guardrails, knowledge injection, Ponytail injection into subagents, design detector |
| `plugins/studio/knowledge/lessons.md` | Base lessons shipped with the plugin |
| `plugins/studio/scripts/doctor.js` | The read-only machine check behind `/studio:setup` |
| `plugins/studio/.mcp.json` | The Context7 MCP server |
| `evals/` | Benchmark tasks with hidden checks (for maintainers) |
| `scripts/vendor.js` | Refreshes the bundled skills (for maintainers) |

## Knowledge

| | Where | Written by |
|---|---|---|
| **Plugin lessons** | `plugins/studio/knowledge/lessons.md`, shipped with the plugin | The plugin's maintainers |
| **Your lessons** | `~/.claude/plugins/data/studio-studio-local/knowledge/lessons.md`, which survives plugin updates | The retro, **automatically**, from each build's experience |
| **Your preferences** | `preferences.md` in the same folder | The retro, automatically |
| **Project lessons** | The project's `CLAUDE.md` | The retro, automatically |

A hook injects all of this into `/studio:build`, `/studio:audit` and `/studio:retro`, so agents never read files outside the project and you get no access prompts. When one of your lessons contradicts a plugin lesson, yours wins, and the retro flags the conflict. Set `STUDIO_KNOWLEDGE_DIR` to use a different folder.

## Guardrails

Always on:
- block deleting the root, a drive, the home folder or a parent folder (`rm`, `rd`, `del`, `Remove-Item` and their aliases), including inside `$(…)` and after `sudo` or `xargs`
- block scripts from the internet piped or substituted into a shell or interpreter (`curl | sh`, `bash <(curl …)`, `iwr | iex`, `iex (iwr …)`) and encoded PowerShell commands
- block writes to `.env` files, from the Write and Edit tools or from the shell (`>`, `tee`, `cp`, `Set-Content`…)
- block content and commands that contain a real-looking secret (AWS, GitHub, Anthropic, OpenAI, Stripe, Slack and Google keys, private keys); placeholders such as `sk-ant-xxxx` pass

In projects with a `.studio/` folder only:
- block force pushes and any push that lands on `main`/`master`, including a bare `git push` from `main` or from a branch that tracks it
- **require `.studio/verify` to pass before every commit**, run in the checkout being committed (an implementer's worktree, not the session folder)

The guard reads the command text: it catches mistakes, but it is not a sandbox. Shells exposed by MCP servers do not go through it. Its tests: `node --test plugins/studio/hooks/guard.test.js`.

## Bundled skills

Pinned versions are in [`plugins/studio/vendor.json`](plugins/studio/vendor.json); licences in [`plugins/studio/THIRD_PARTY_NOTICES.md`](plugins/studio/THIRD_PARTY_NOTICES.md).

| Skill | Why it's in | How studio uses it |
|---|---|---|
| **Impeccable** 4.7.0 | The first real build had a functional but generic UI | Design step before gate 1, visual system task, design gate in review. Detector binary downloaded on first use; telemetry off |
| **Ponytail** 5.3.2 (skill only) | The first real build was "a simple app with a lot of code" | Injected into every `studio:*` subagent and the build orchestrator. A/B on evals 012–014: −58% code, −43% cost, 3/3 passing in both arms |
| **graphify** 0.9.11 | Map of large codebases | Only on explicit call (`/studio:graphify`), so it doesn't take over unrelated sessions |
| **Humanizer** 3.0.0 | Docs that don't read as AI-written | Delivery docs, READMEs, the audit's `report.md` prose |
| **Context7** (`context7-mcp` skill) | Current library docs instead of model memory | Explorer and implementers; one ID lookup, then one query per concept |

If you already had any of these installed separately, `/studio:setup` disables the extra copies with your OK, so they don't run twice.

## For maintainers

### Evals

```bash
node evals/run.js --dry-run
```

```bash
node evals/run.js --label baseline
```

Each task lives in `evals/tasks/<id>/`: `task.md` (the request), `fixture/` (starting code), `check.js` (hidden check, copied in only after the agent finishes), `reference/` (a correct solution that validates the check) and optionally `command` and `flags`. `--dry-run` checks every check both ways: it must fail on the fixture and pass with the reference. The agent under test can only reach the plugin folder, never `evals/`.

Results go to `evals/results.csv`: pass/fail, cost, wall-clock time, turns, model, studio version, plus metrics such as lines of code added, test lines and dependencies, and, for audits, recall and false positives on decoys.

| Size | Tasks |
|---|---|
| Small | 001 slugify, 002 cart discount, 003 users 404, 004 signup validation, 005 CSV parser regression |
| Medium | 006 auth + pagination, 007 todo CLI, 008 CSV ETL, 009 search UI states, 010 schema migration, 011 rates integration |
| Large | 012 notes CRUD app, 013 error-handling refactor |
| Greenfield (idea phase on) | 014 expense split, 015 habit streaks |
| Audit | 016 Node shop API, 017 Python expenses app (8 planted issues + 4 decoys each) |
| Single agent | 018 verifier vs 4 false and 2 real findings, 019 critic vs a spec with 7 planted defects and 2 decoys, 020 reverser on a minified bundle with dead code and an injected comment (needs REA) |
| Visual (blind jury) | 021 workshop app screen, 022 bakery landing page, 023 polish of an AI-looking clinic agenda |

**Rule:** before adding a skill, changing a model or editing a prompt, commit, run the relevant evals with `--label` before and after, and compare. `--settings <file>` and `--extra-plugin <dir>` support A/B tests of plugins; `--stats <workspace>` measures code size; `--isolate` leaves out your personal skills, plugins, hooks and MCP servers; `--control` runs the task with no studio at all.

The visual evals' `check.js` only confirms the page exists and kept its content. Design is judged from screenshots by jurors who don't know which side is which; it needs Chrome, or `CHROME` set to its path:

```bash
node evals/run.js --task 021-visual-app-screen,022-visual-landing,023-visual-polish --isolate --label visual-studio
```

```bash
node evals/run.js --task 021-visual-app-screen,022-visual-landing,023-visual-polish --control --label visual-control
```

```bash
node evals/visual/jury.js --a visual-studio --b visual-control
```

The output in `evals/visual/out/` has `report.md`, `key.json` and `board.html`, for your own vote before you open the key. Side A wins only with a juror majority on at least 2 of 3 tasks and an average gain of at least 2 points out of 25. With one run per side this shows a direction, not a measurement.

### Updating bundled skills

Read the new upstream code first, then run `node scripts/vendor.js <impeccable|ponytail|graphify|context7|humanizer> <source-folder>`, bump the version in `plugins/studio/.claude-plugin/plugin.json`, run `node scripts/check-release.js`, run the evals, and commit.

### Tool decisions

New tools go in only when a real failure or an eval justifies them.

| Tool | Status | Reason |
|---|---|---|
| Impeccable, Ponytail, graphify, Humanizer, Context7 | Bundled | See [Bundled skills](#bundled-skills) |
| REA | Optional, not bundled | 49 MB and frequent releases; `/studio:reverse` uses your own install. `reverser` gets only REA's static tools; runtime tools belong to `reverser-live`, which runs only with `--runtime` and an approved run list. Neither gets `uninstall_adb_package` or `push_adb_file`, and `reverser-live` also leaves out the raw consoles `gdb_console`, `execute_rizin_command`, `rizin_debug_command` and `cutter_command` |
| Strix (dynamic pentesting) | Waiting | For a future deploy step, against staging |
| addyosmani/agent-skills, thermo-nuclear review, Emil Kowalski design skills, 21st.dev Magic MCP | Waiting | No failure that justifies them yet |
| pstack (full plugin) | Rejected | Its router competes with the orchestrator |
| Hallmark | Rejected | Duplicates Impeccable; two design skills give contradictory instructions |
| Taste, Unslop | Rejected as bundled skills | Same conflict as Hallmark. The visual evals borrow Taste's blind comparison. Tested on 2026-11-03 on top of plain Claude, one run each against a plain-Claude run that later proved unusually good. Unslop won 0 of 3. Taste won 023 against all three plain-Claude runs and also against the studio, but lost 022 by inventing content and using stock photos. It beat plain Claude on 021 in two of three runs and lost 021 to the studio. Inside the studio, used only for 023, it lost both runs to the plain studio: its standalone wins came from adding features, which the studio's spec keeps out |
| Scrapling | Rejected | No research failures to fix; its strength is bypassing anti-bot protection, which is a terms-of-service risk |
| Agent-Reach | Rejected | Copies browser session cookies and installs through remote instructions run by the agent |
| Harness² | Rejected for now | Linux and Vertex AI only; its core idea (improve the harness with evidence) is already covered by the evals |
