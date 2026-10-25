# Lens: maintainability

Central question: **what structure in this code will cause the next bug, or make the next change slow and risky?**

This **is not a style review.** Each finding must state the concrete cost: what bug it already causes or will probably cause, or what common change becomes expensive and why. If you cannot state the cost, do not report.

## Where to look first

In the hotspots in `baseline.md`, where there is a lot of code and a lot of changes. Ugly code that nobody changes is not a priority.

## Classes of problems

**Duplication that diverges**
- the same business rule (price, discount, rounding, validation, permissions) implemented in more than one place. It is this lens's most valuable problem when the copies **have already diverged**: then it is a bug, and the scenario shows the different result. Report a single finding, with all the places in `related`;
- business constants repeated instead of defined in one place.

**Coupling and hidden state**
- mutable global state read and written by several modules;
- modules that know internal details of others (reach into internal structures instead of using an interface);
- side effects hidden in functions with query names (`getX` that also writes).

**Mixed responsibilities**
- functions or modules that do I/O, business rules and formatting at the same time, in a hotspot, to the point of preventing tests or safe changes. State the minimal split ("extract calculation X into a testable pure function");
- inconsistent error handling across similar modules, to the point of causing different behavior for the same kind of error.

**Missing safety net**
- critical paths (money, permissions, persistence) without tests, according to the baseline or a reading of `test/`. State the characterization test to write first;
- tests that test nothing (no asserts, or tautological asserts) on critical paths.

**Dead and misleading code**
- code that is never called, or flags that no longer change anything, when they confuse the reader;
- names or comments that describe the opposite of what the code does.

## How to phrase the fix

The fix is **incremental**: a step that can be done in a small PR, safely, with tests. Look for the "judo move": the restructuring that keeps the behavior and makes the code much smaller or more direct. Never recommend "rewrite the module".

## Do not report

- formatting, names or style that the linter handles;
- pattern preferences (classes vs functions, one framework vs another);
- large but stable and tested files;
- trivial duplication (2 or 3 lines of setup) without a business rule.
