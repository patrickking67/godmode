---
name: exorcise
description: Find the root cause of a bug or failing test before fixing it (reproduce, rank hypotheses, isolate, explain, apply the smallest fix, re-run). Use when something fails, crashes, flakes or behaves wrongly and the cause is unknown.
allowed-tools: Read, Grep, Glob
engines: both
---

Track the failure in the request (a bug report, a failing test name or pasted error
output) to its cause, fix that cause and prove the fix. No patching symptoms.

## When to use

- A test fails, a command errors, a program crashes or misbehaves, and the cause is unknown.
- Not to explain working code (use `gospel`) and not to build a feature (use `genesis`).

## Procedure

### 1. Reproduce

Establish the exact failing command, input or test and run it yourself. Confirm you see
the same failure: same error, same stack, same assertion. Keep the full output; it is the
primary evidence. For a flaky failure, run it enough times to measure how often it fails.

### 2. List hypotheses

Before changing code, write down the two to four most likely causes, reasoned from the
error and the stack trace. Rank them by likelihood and by how cheap each is to check.

### 3. Isolate

Test the hypotheses in rank order, one variable at a time:

- Read the code paths the trace implicates, with their callers and callees.
- Add temporary instrumentation (logging, assertions) or inspect state to see what
  happens, as opposed to what you assumed. Keep a list of everything you add.
- Bisect: disable, stub or split inputs to halve the search space each step. If it
  worked before, `git bisect` or the recent history of the implicated files narrows it.

Continue until one line, one value or one condition is responsible.

### 4. State the root cause

Say what is wrong and why it produces this failure: the wrong value, the missing case,
the bad assumption, the ordering. The explanation must account for every detail of the
observed failure, including when it does not happen. If it does not, return to step 2.

### 5. Fix the cause

Make the smallest change that removes the cause. Add or extend a test that fails without
the fix and passes with it. Never disable a safety check, delete or skip a test, weaken
an assertion, add a retry around a logic error or bypass a hook to make the error go away.

### 6. Report

Give the root cause, the fix (files and lines), the test that pins it, and the commands
you ran with their results. Say what remains uncertain.

## Stop conditions

- The failure cannot be reproduced: say so, list what you tried, and ask for versions,
  environment, exact steps or a minimal example. Do not guess at a fix.
- The fix needs a destructive or hard-to-reverse action, a dependency change or a
  change to a public interface: describe it and ask before applying.
- The cause is outside the repository (a dependency bug, a service, the environment):
  report the evidence and the workaround options, and let the user choose.
- Three hypotheses in a row are disproved: stop, summarize what is now known and ruled
  out, and reconsider the assumptions before continuing.

## Verify

Re-run the reproduction from step 1; it must now pass. For a flaky failure, run it at
least as many times as it took to see the failure before. Run the related tests and the
project's checks to confirm nothing regressed. Remove every piece of temporary
instrumentation on your list and confirm with `git diff` that only the fix and its test
remain.
