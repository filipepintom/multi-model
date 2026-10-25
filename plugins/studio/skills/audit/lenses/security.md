# Lens: security

Central question: **what attacker-controlled input reaches a place where it causes harm, and what stops it, if anything does?**

Work **from source to sink**. The sources are the trust boundaries in `map.md`: route and query parameters, request body, headers, cookies, uploaded or imported files, command-line arguments, controllable environment variables and data from external services. For each source in scope, follow the value to the dangerous sinks.

## Dangerous sinks

**Injection**
- shell: `exec`, `spawn` with `shell: true`, `subprocess` with `shell=True`, `os.system`, backticks. Concatenating or interpolating input into the command is the flaw;
- SQL or NoSQL: queries built with concatenation, template strings, f-strings or `%`/`.format`, instead of placeholders;
- paths: input joined to a base directory without resolving it and confirming it stays inside (`../`, absolute paths, symlinks);
- deserialization: `pickle`, `yaml.load` without SafeLoader, `eval`/`Function`/`exec`, `vm` with input;
- templates and HTML: XSS in server-generated HTML, without escaping; header injection.

**Authentication and authorization**
- routes that check *who* you are but not *whether you may* access that resource (IDOR): get, change or delete by id without confirming the owner or the role;
- authorization checked only on the client, or only on some routes of the same resource;
- predictable tokens (`Math.random`, timestamps), sessions without expiry, secret comparisons that are not constant-time, when that is exploitable;
- passwords stored without a slow salted hash (bcrypt, scrypt, argon2, PBKDF2).

**Availability and limits**
- request body, upload or imported file without a size limit;
- regex with catastrophic backtracking over user input;
- expensive operations without a limit (pagination without a maximum, full exports).

**Exposure**
- secrets in code or in versioned files;
- stack traces, queries or internal data in error responses;
- sensitive data in logs (passwords, tokens, personal or financial data);
- SSRF: a user-supplied URL requested by the server.

**Dependencies**
- known vulnerabilities that `baseline.md` reports. They are only findings if the code uses the vulnerable part.

## How to prove it

Write the full path: `source (file:line) → transformations → sink (file:line)`, with a concrete, harmless payload. For example: `GET /export?name=x;touch /tmp/pwn` → `routes/exports.js:31` interpolates `name` into `exec(...)` → the command runs. Confirm that no middleware or validation along the path blocks the payload.

## Do not report

- `exec` or `subprocess` with a constant command or an argument list without a shell;
- paths that are already resolved and confirmed to be inside the base directory;
- non-cryptographic hashes used for cache or ETag (`md5(..., usedforsecurity=False)`), and `Math.random` for things that are not security-related;
- generic "best practices" without a concrete vector (missing CSP on a JSON API, recommended headers) that have no exploitable impact in this code.

For deep security audits of a whole repository, recommend Claude Security (`/claude-security`) in the report as the next step.
