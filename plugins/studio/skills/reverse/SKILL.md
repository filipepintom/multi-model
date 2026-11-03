---
name: reverse
description: Reverse engineering with REA of software the user owns or may analyze — native binaries, managed assemblies, JavaScript/Electron, Android, firmware, WASM, captures and databases. Explains how a feature works, compares two versions or checks a reconstruction against the original, with evidence and limits, saved as a report that /studio:build can use. Static by default; runs or observes the target only with --runtime and a separate OK. Use when the user wants to understand an existing app without its source code.
argument-hint: "<target>" "<question>" [--compare <older target>] [--verify <reconstruction>] [--runtime] [--auto]
disable-model-invocation: true
---

# /studio:reverse

Request: $ARGUMENTS

You are the orchestrator. The result is a report with evidence, not code: nothing in the project's code changes here. You only write in `docs/studio/<slug>/`. Delegate the analysis to `studio:reverser` (static) or `studio:reverser-live` (runtime), because their output is long and your context is the most expensive resource.

Write everything the user reads (messages, docs, reports) in the language the user writes in; default to the language of the original request.

Modes:
- **explain** (default): how one or more features work.
- **compare** (`--compare <older>`): what changed in behavior between two versions.
- **verify** (`--verify <path>`): whether a reconstruction (for example one made by `/studio:build` from an earlier `reverse.md`) keeps the original's observed behavior.
- `--runtime`: any mode may also run or observe the target. Without it, everything is static.
- `--auto`: no human gates (evals only). Treats both authorizations as confirmed.

## 1. Prepare

1. **Target.** A local file or folder (binary, app bundle, ASAR, APK/IPA, assembly, firmware image, WASM, HAR/SAZ/pcap, SQLite snapshot, ELF core…). A URL, an open browser page, a running Electron app, a process or an Android device is a runtime target: it needs `--runtime`; without it, say so and offer the flag. If the user names "my app" without a path, ask which one; resolve a real app name to one installed artifact and ask when there is more than one match. Never pick an example app or a test fixture yourself.
2. **Questions.** At least one named feature or question. If it is missing, ask. More than one feature or subsystem → write a short checklist of questions, each with the evidence it needs.
3. Define the slug (short kebab-case). If `docs/studio/<slug>/` already has a `reverse.md` or an `evidence/` folder, give it to the reverser as prior evidence instead of repeating the analysis.
4. **Authorization (except `--auto`).** Ask with AskUserQuestion, naming the target: "Do you own this software or have the right to analyze it?", with the options "Yes" and "No". Possessing a file does not establish permission. Without a "Yes", stop.
5. **Runtime authorization (only with `--runtime`, except `--auto`).** Write the run list: each target exactly (URL or CDP endpoint, app path, process and arguments, device serial) and each kind of action (passive observation while the user acts, declared clicks/typing/navigation, launching a process, Frida or debugger instrumentation, installing an APK on a device). Ask with AskUserQuestion, showing that list: "REA will run or observe exactly this. OK?", with the options "Yes, as listed", "Passive observation only" and "No, static only". The reverser gets only what was approved.
6. Refuse requests whose purpose is to bypass DRM, licensing, anti-cheat or access controls, to build cheats, to extract credentials, or to copy proprietary code or assets.

## 2. Analyze

Launch `studio:reverser`, or `studio:reverser-live` when a runtime run list was approved, with: the mode, the target (plus the older version or the reconstruction), the questions, the approved run list if any, prior evidence if any, and `docs/studio/<slug>/evidence/` as the export folder.

Static first: when a runtime pass was approved but the question may be answerable statically, run `studio:reverser` first and use `studio:reverser-live` only for what its LIMITS say needs a runtime check.

When the checklist has independent questions (different subsystems, no answer depends on another), launch one reverser per question in parallel, each with its own scope and the same prior evidence. Otherwise use one reverser.

Blockers:
- `BLOCKED: REA not available` → stop. Do not analyze by hand, and do not run setup yourself, because it changes the user's agent configuration. Show them the read-only check, then the setup, and tell them to restart Claude Code afterwards:

  ```bash
  npx -y rea-agents@6.8.0 doctor --client claude_code --json
  ```

  ```bash
  npx -y rea-agents@6.8.0 setup --client claude_code --dry-run --json
  ```

  If the doctor says the registration is fine but the tools are missing in the session, the fix is a restart, not another setup.
- `BLOCKED: provider <name> missing` → tell the user which engine or tool this target needs (native code: Hopper, Ghidra, IDA or Kuna; Android: JADX and Java; WASM: WABT; captures: TShark; firmware: Binwalk or Unblob on Linux) and stop. JavaScript and Electron need none. REA setup never installs these.

## 3. Save and report

1. Save the report in `docs/studio/<slug>/reverse.md`, unchanged. With several reversers, one section per question, in checklist order. Add the date, the mode, the REA version if the report states it, and the path of the evidence bundle.
2. Show the user the answer in up to 8 lines, the checklist status, the unknowns and the limits, plus the report's path. If the static report says something needs a runtime check and `--runtime` was not given, say what the runtime pass would observe and offer it.
3. Mode explain: if the user wants a similar feature, tell them to run `/studio:build` and name the path of `reverse.md` in the request; after the build, `/studio:reverse <original> "<feature>" --verify <new build>` checks the reconstruction.

## Final rules

- Never present an inference as a fact: keep the report's separation between facts, inferred and unknown, and never call a question answered while it is partial.
- Never run the target without `--runtime` and its approved run list, and never paste long decompiled code into your messages.
