---
name: retro
description: Retrospective of a studio build — turns failures and escalations into reusable lessons. Runs at the end of each /studio:build or manually on a slug.
argument-hint: "[slug]"
disable-model-invocation: true
---

# /studio:retro

Slug: $ARGUMENTS (if empty, use the most recently modified `docs/studio/*/state.md`).

Language: write everything the user reads (messages, docs, reports, the text inside artifacts) in the language the user writes in; default to the language of the original request.

## 1. Gather facts

Read, in `docs/studio/<slug>/`: `state.md` (escalations), `plan.md` (attempts per task, tiers), `review.md` (rounds and blockers) and `delivery.md`. Use only facts from these files; do not make anything up.

## 2. Write `docs/studio/<slug>/retro.md`

```
# Retro — <slug>

## Numbers
- Tasks: <n> · blocked: <n> · tier escalations: <n> · escalations to a human: <n>
- Review rounds: <n> · blockers found: <n>

## What went wrong (cause, not symptom)
- <problem> → <root cause> → <what would have prevented it>

## Routing
- Tasks whose tier was wrong: <id, planned tier → tier it needed>

## Lessons
- <lesson>
```

## 3. Save lessons (this is where the system learns)

The context already carries, in the "Studio knowledge" section injected by the plugin, the **plugin lessons** (base, read-only), **your lessons** and **your preferences**, with the path of the personal folder. Use that content to look for duplicates and conflicts without reading the files again.

For each lesson, decide where it belongs:

- **Specific to this project** (conventions, codebase pitfalls) → add it to the project's `CLAUDE.md`.
- **Useful in other projects** → in **your lessons** (`lessons.md` in the personal folder): in the **General** part (process, spec, routing, verification) or in a `## Stack: <technology>` section (create it if it does not exist). When in doubt between general and stack, it is stack.
- **You never edit the plugin lessons.**

The personal files may have been created with Portuguese headings: when a matching section heading already exists in the file, use it instead of adding an English duplicate.

Rules:
- At most 3 new lessons per retro. Prefer the ones that would have prevented an escalation.
- **No duplicates:** if a plugin lesson or one of yours already covers the same thing, do not add it. If your experience refines it, update yours.
- **Conflicts:** if a lesson of yours contradicts a plugin lesson, keep yours (it holds for this user), add `(contradicts plugin lesson: <summary>)` and mention it in the final summary. Either the shared lesson is wrong, or it is a special case worth recording.
- **Consolidate:** if your lessons go past ~40 lines, merge the similar ones and delete the obsolete ones before adding.
- A lesson that proved wrong or obsolete is deleted.
- Format: one actionable line + `(source: [[<slug>]], <YYYY-MM-DD>)`.
- With `--auto` (evals), do not save lessons.

## 4. Update your preferences

Lessons say how the studio should work; preferences say what **this user** tends to want. Read in `state.md` the decisions the user changed at gate 1, and any feedback from them on the delivery. For each clear pattern, add or update a line in `preferences.md` in the personal folder, in the right section (create it if it does not exist: Product and scope, Architecture and data, Access and hosting, Design), with the source.

- Only record what the user chose or said, never what you inferred without evidence.
- An isolated, very project-specific choice is not a preference. Two choices in the same direction, or an explicit statement from the user, are.
- If a new preference contradicts an old one, replace the old one: people change their minds.
- With `--auto` (evals), do not change the preferences.

End with a 3-line summary to the user: numbers, the most important lesson and where it was saved, and the conflicts, if any.
