---
name: setup
description: Checks this machine for everything the studio plugin needs (Node, git, Python for graphify, the Impeccable detector, Context7 reachability, duplicate installs, the personal lessons folder) and fixes what it can, each change only with the user's OK and always reversibly. Run it once after installing or updating the plugin.
argument-hint: "[--check]"
disable-model-invocation: true
---

# /studio:setup

Arguments: $ARGUMENTS (`--check` = report only, change nothing)

You prepare this machine for the studio plugin. Work in English unless the user writes in another language.

## 1. Diagnose

Run the doctor bundled with the plugin. It is read-only:

```
node "<this skill's base directory>/../../scripts/doctor.js"
```

Show its report table to the user as-is. On the first run, the Impeccable check may take a minute while it downloads the detector binary.

Then test Context7 for real: call the Context7 MCP tool `resolve-library-id` with `libraryName: "react"` and `query: "useState hook"` (both arguments are required). A result means the docs server works end to end. If the tool is missing or fails, report it next to the doctor's network check.

With `--check`, stop here.

## 2. Fix, one item at a time, each with the user's OK

For every ⚠️ or ❌ that has a fix below, explain in one sentence what you will change and why, then ask with AskUserQuestion (Apply / Skip). Never batch silent changes. **Every change must be reversible:** move instead of delete, disable instead of uninstall, and back up any file before editing it.

**Bundled skills installed twice.** The studio plugin already ships Impeccable, Ponytail, graphify, Humanizer and the Context7 skill and MCP server. Copies installed elsewhere run in addition to the bundled ones.
- A global skill folder (`~/.claude/skills/<name>`): move it to `~/.claude/skills-disabled/<name>`. If it is a symlink, move only the link, never its target.
- A plugin (`ponytail@…`, `impeccable@…`, `humanizer@…`, `graphify@…`, `context7@…`): `claude plugin disable <id>`. Tell the user how to re-enable it.
- A `context7` MCP server in the user's `.claude.json`: `claude mcp remove context7 --scope user`, after showing the user its current entry (`claude mcp get context7`) so they can add it back.
- Impeccable hooks in `~/.claude/settings.json`: first copy the file to `settings.json.bak-<YYYYMMDD-HHMM>`, then remove only the hook entries whose command contains `impeccable`. Keep every other hook and setting untouched, and show the user the removed entries.

**Retro can write lessons without asking.** Offer to add `Edit` and `Write` allow rules for the personal lessons folder that the doctor printed, and nothing broader, to `~/.claude/settings.json`. Use the `update-config` skill to write the rules with the correct absolute-path syntax. Back up the file first.

**Missing tools** (Node, git, Python, uv): don't install them yourself. Give the user the exact install command for their OS, and offer to rerun the check afterwards.

**Claude Security plugin not installed:** optional. Mention the install command once; don't push.

## 3. Confirm

Rerun the doctor and show the final table. End with three lines:
- what changed (with the backup file names);
- what is still pending and why;
- next step: open a project and run `/studio:build "<idea>"` (or `/studio:audit "<area>"` for existing code), with the main session on Opus.

## Rules

- Never touch the user's projects, credentials, or settings unrelated to the items above.
- Never delete files: move them to a `-disabled` folder or back them up.
- If a fix fails, stop that item, report the error, and continue with the next.
