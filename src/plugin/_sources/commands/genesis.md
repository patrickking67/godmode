---
name: genesis
description: Implement a feature or change end to end (restate the goal, match existing patterns, build in small tested steps, run the project's checks). Use when the user asks to build, add, change or refactor something concrete. For a plan only use prophecy; for a bug or failing test use exorcise.
allowed-tools: Read, Grep, Glob
engines: both
---

Build the change the request describes so it reads like the code around it, then prove
it works with the project's own checks. This workflow edits files and runs commands; it
does not commit, push or open a pull request.

## When to use

- The user asks to build, add, change or refactor something specific.
- Not for a plan without edits (use `prophecy`), not for a failure whose cause is unknown
  (use `exorcise`), and not to commit the result (use `covenant`).

## Procedure

### 1. State the goal and the acceptance criteria

Write one sentence on what you are building and a short list of observable criteria that
mean it is done. Derive both from the request.

### 2. Survey the neighbors

Read the code the change will sit beside and note what to match: naming and file layout,
error handling, test location, framework and style. Read the repository's agent guide or
contributing guide if it has one, and note generated files that must be rebuilt instead
of edited.

### 3. Plan

List the edits in order, one item per file or logical change. Use the host's task list
if it has one. Keep it to the work; this is a checklist, not a design document.

### 4. Build in small steps

Work one item at a time. Where a test suite exists, write or extend a failing test that
pins the new behavior, watch it fail, then make it pass. Build what was asked and nothing
else: no speculative abstraction, no unrequested refactor, no configuration for later, no
comment that only restates the code.

### 5. Delegate only when it pays

If the plan has independent parts that touch separate files, give each to a subagent
with a self-contained brief and integrate the results. For a small or tightly coupled
change, do it inline.

### 6. Report

Say what changed, list the files, and give the commands you ran with their results. Name
anything you could not verify.

## Stop conditions

- Requirements conflict, or a decision the request does not cover would change the
  design: ask one question and wait.
- The change turns out much larger than asked, or needs a new dependency, a schema
  migration or a public API change: stop and confirm scope first.
- Any destructive or hard-to-reverse action (deleting data, rewriting history, running
  against production): ask first.
- A check was already failing before your change: report it and do not fix it unasked.

## Verify

Run the project's own typecheck, lint, tests and build, as its manifest or CI defines
them, and read the output. Fix what you broke and re-run until they pass. Then walk the
acceptance criteria from step 1 and confirm each one against real behavior (run the
command, call the function, load the page), not only against a green test run. Never
weaken a test, a lint rule or a type to get to green.
