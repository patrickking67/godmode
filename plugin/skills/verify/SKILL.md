---
name: verify
description: "Run the project's checks (typecheck, tests, lint, build) and report results."
---

Run this project's own quality checks (or the subset named in `$ARGUMENTS`) and report
exactly what passed, what failed, and the single most useful thing to do next.

## 1. Detect the toolchain

Find the checks this project actually defines — never invent commands:

- **Node**: read `package.json` `scripts` for `typecheck`/`tsc`, `test`, `lint`, `build`.
  Pick the runner from the lockfile present — `pnpm-lock.yaml` → pnpm, `yarn.lock` →
  yarn, otherwise `package-lock.json` → npm.
- **Make**: a `Makefile` with targets like `test`, `lint`, `check`.
- **Other languages**: `cargo test`/`cargo clippy`/`cargo build`, `go test ./...`/`go vet`,
  `pytest` plus `ruff`/`mypy`, or the equivalent the repo is set up for.

If `$ARGUMENTS` names a subset (e.g. "just tests", "lint"), run only that. Otherwise run
the full relevant set. State which checks you found in one line before running.

## 2. Run each available check

Run them in cheap-to-expensive order — typecheck, lint, tests, then build only if it is
quick. For each:

- Capture exit code and output.
- A non-zero exit (or a runner's own failure summary) is a FAIL.
- If a check isn't defined in the project, skip it and say so — don't substitute your own.

## 3. Report results

One clear line per check:

- `PASS — typecheck (tsc)`
- `FAIL — tests (3 failing)`

For each failure, excerpt the *actual* failing output — the assertion, the error, the
offending lines — not the whole log. Point to the `path:line` involved as a clickable
reference so the user can jump straight there.

## 4. Verdict and next step

End with a one-line verdict — all green, or N checks failing — and the single most useful
next action (e.g. "fix the type error in `src/api.ts:42`, then re-run", or "all checks
pass — ready to commit").

This command is read-only apart from running the checks. Do not fix, edit, or commit
anything unless the user explicitly asks — report the failures and stop.
