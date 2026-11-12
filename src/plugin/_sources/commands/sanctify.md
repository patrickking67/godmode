---
name: sanctify
description: Run the project's own checks (typecheck, lint, tests, build) and report pass or fail per check with the failing output. Use when the user asks to verify, run the checks or confirm a change is green before committing. It reports and does not fix.
allowed-tools: Read, Grep, Glob
engines: both
---

Run the checks this project defines, or the subset the request names, and report what
passed, what failed and the next action. It runs commands but edits nothing.

## When to use

- The user asks to verify, run the tests, run the checks or confirm things are green.
- Not to find why a check fails (use `exorcise`) and not to review a diff (use `judgment`).

## Procedure

### 1. Find the defined checks

Use what the repository defines and never invent a command:

- A single check command, if one exists (`check`, `verify`, `ci`, `make check`, a script
  the agent guide or CI workflow names). Prefer it: it is what CI runs.
- **Node**: the `typecheck`, `lint`, `test` and `build` scripts in `package.json`. Pick
  the runner from the lockfile: `pnpm-lock.yaml` means pnpm, `yarn.lock` yarn,
  `bun.lock` or `bun.lockb` bun, `package-lock.json` npm.
- **Other stacks**: `Makefile` targets, `cargo test` and `cargo clippy`, `go test ./...`
  and `go vet ./...`, `pytest` with `ruff` or `mypy`, or whatever CI runs.

If the request names a subset ("just lint"), run only that. State the checks you found
and the commands you will run in one line before running them.

### 2. Run them

Run cheapest first: typecheck, lint, tests, then build. Run every check even if an
earlier one fails, so the report is complete. For each, record the command, the exit
code and the output. A non-zero exit or a runner's own failure summary is a FAIL. If a
check is not defined, mark it SKIPPED; do not substitute your own.

### 3. Report

One line per check, then detail for failures:

```text
PASS     typecheck   pnpm typecheck
FAIL     tests       pnpm test (3 failed, 72 passed)
SKIPPED  build       no build script
```

For each failure, quote the failing output itself (the assertion, the error, the
offending lines), not the whole log, and give the `path:line` it points at.

End with one verdict line (`all green` or `N of M checks failing`) and the single most
useful next action.

## Stop conditions

- No checks are defined anywhere: say so, list where you looked, stop.
- A check needs something missing (dependencies not installed, a service, credentials):
  report it as BLOCKED with the exact error. Do not install or configure anything unasked.
- A command would deploy, publish, migrate or write outside the repository: do not run
  it, and say why.
- A check hangs or starts a watch mode: stop it and report it as BLOCKED.

## Verify

Every PASS or FAIL must come from an exit code you observed in this run, never from an
earlier run or from reading the code. Counts in the report must match the runner's own
summary. Do not fix, edit or commit anything; report and stop.
