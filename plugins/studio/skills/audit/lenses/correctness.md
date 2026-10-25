# Lens: correctness

Central question: **where does this code produce a wrong result, lose data or end up in an inconsistent state, with inputs or conditions that will happen in production?**

## Where to look first

1. The critical paths in `map.md`: money, user data, persistent writes, authentication and shared state.
2. The hotspots in `baseline.md`: large, frequently changed files concentrate bugs.
3. The tests that fail in the baseline: each one is already a finding.

## Classes of problems

**Logic and boundaries**
- off-by-one in ranges, pagination and indexes; inclusive vs exclusive at the boundaries (the last day of the month, the last item, the end of a range);
- empty, null or missing cases: empty list, optional field, division by zero, first use;
- inverted conditions and operator precedence; comparisons with the wrong type (string vs number, loose `==`).

**Errors and partial failures**
- swallowed errors: an empty `catch`/`except`, or one that only logs, followed by code that assumes success;
- failures halfway through a multi-step operation that leave the state inconsistent (debited but did not record; marked as paid without charging);
- non-atomic file writes (opening the real file in "w" mode; a failure halfway truncates it);
- resources not released (files, connections, timers) on error paths.

**Concurrency and time**
- read-modify-write with an `await`/IO in between, without a lock or atomic operation: two simultaneous runs lose an update or spend twice;
- TOCTOU: check then use, with a window between the two;
- caches that go stale; mutable global state shared between requests;
- dates: time zones, daylight saving changes, naive dates mixed with zoned dates, end of month, leap years.

**Numbers and money**
- money in `float` (sums, taxes, discounts) without cents or decimal arithmetic;
- rounding each item vs rounding the total; the banker's rounding of Python's `round()` vs commercial rounding;
- overflow, truncation and implicit conversions.

**Contracts between modules**
- the same business rule implemented in two places, with different behaviors (for example the price shown vs the price charged). Report both places in a single finding, with `related`;
- a function that returns different shapes depending on the path (sometimes `null`, sometimes it throws);
- mutable default values (`def f(x=[])`) and objects shared by reference.

## How to prove it

For each candidate, write the concrete input and the wrong result, for example: "two simultaneous `POST /wallet/debit` requests of €80 with a balance of €100 → both pass the check → final balance €20 instead of refusing the second". If you cannot write this sentence, do not report.

## Do not report

- style, names, formatting, or what a linter already catches;
- "missing validation" without a concrete input that causes harm;
- correct error handling that is only different from what you would do (log and rethrow, return 5xx with context);
- hypotheses that require another component to already be broken.
