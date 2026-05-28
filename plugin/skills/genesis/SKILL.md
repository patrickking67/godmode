---
name: genesis
description: "Implement a feature or change with a tight plan, build, and verify loop."
---

Build the feature or change described in `$ARGUMENTS` cleanly and correctly: plan it,
match the codebase, ship it in small steps, and verify it works.

## 1. Clarify the goal

State in one sentence what you're building and what "done" looks like — the acceptance
criteria. Derive both from `$ARGUMENTS`. Only ask the user if the request is genuinely
ambiguous (conflicting requirements, missing a critical decision); otherwise proceed.

## 2. Survey existing patterns

Before writing anything, read the neighboring code your change will live among. You're
looking for the conventions to match, not inventing your own:

- **Naming and structure** — how files, functions, and modules are named and laid out.
- **Error handling** — how this codebase reports and recovers from failures.
- **Tests** — where tests live, the framework, and the style of existing cases.

New code should look like it was always there.

## 3. Plan

Write a short checklist of the concrete edits using the todo tooling — one item per file
or logical change, in the order you'll make them. Keep it to the actual work; this is a
plan, not a design doc.

## 4. Build in small steps

Work through the checklist one item at a time. Follow the patterns from step 2. Where a
test suite exists, prefer test-driven: write or extend a failing test that pins the new
behavior, then make it pass. Keep each change focused and self-contained.

Build exactly what was asked — no speculative abstractions, no unrequested refactors, no
extra config "for later" (YAGNI). Do not add comments that merely restate what the code
does.

## 5. Dispatch gate

Decide how to execute before charging ahead:

- **Large or parallelizable** — fan out `Task` subagents, one bounded task each (e.g. one
  per independent module), and integrate the results. Give each a clear, self-contained brief.
- **Small or tightly coupled** — just do it inline. Don't add coordination overhead a
  one-file change doesn't need.

## 6. Verify

Run the project's own checks — typecheck, tests, lint — and read the output. Fix anything
you broke until they pass. Confirm the acceptance criteria from step 1 are actually met.

Report what changed, which files, and how you verified it. Do not commit, push, or open a
PR unless the user explicitly asks — this command implements and verifies, nothing more.
