# Retro — audit-distribution-extras

- 1 implementer, 3 review rounds. The graphify guard was exploitable twice after "fixes": first through a project venv symlink (realpath resolved outside), then because `-c` puts the cwd on sys.path. Each time the reviewer proved it with a probe.
- Cause: validating an untrusted interpreter by running it. The safe order is: decide from the path alone, then run only from outside the project with PYTHONSAFEPATH.
- Lesson candidate (general, awaits user confirmation): never validate an untrusted executable path by executing it from the project folder; check the path (resolved and unresolved) first.
