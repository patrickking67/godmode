---
name: debug
description: Systematically find the root cause of a bug or failing test.
allowed-tools: Bash, Read, Grep, Glob, Edit, Task, TodoWrite
engines: both
---

Track down the true root cause of the problem described in `$ARGUMENTS` — a bug report,
a failing test name, or pasted error output — and fix it without papering over it.

## 1. Reproduce

You cannot fix what you cannot trigger. Establish the exact failing command, input, or
test from `$ARGUMENTS` and run it yourself:

- Pin down the precise repro — the command, the environment, the inputs.
- Run it and confirm you see the same failure (same error, same stack, same assertion).
- Capture the full output. The exact message and stack trace are your primary evidence.

If you cannot reproduce it, say so plainly and gather more: ask for versions, environment,
exact steps, or a minimal example. Do not guess at a fix for a failure you have not seen.

## 2. Form hypotheses

Before touching code, list the few most likely causes — usually two to four. Reason from
the error and the stack trace, not from a hunch. Rank them by likelihood and by how cheap
they are to check. This list is what keeps you from flailing.

## 3. Narrow it down

Work top-down through your hypotheses to isolate the smallest failing unit:

- Read the relevant code paths the trace implicates — and their callers and callee context.
- Add temporary instrumentation (logging, prints, assertions) or inspect state to confirm
  what is actually happening versus what you assumed.
- Bisect: disable, stub, or split inputs to halve the search space each step. Narrow until
  one line, one value, or one condition is unambiguously responsible.

## 4. Identify the root cause

State the actual root cause — not the symptom — and explain **why** it fails: the wrong
value, the missing case, the bad assumption, the order of operations. If your explanation
does not account for every detail of the observed failure, you are not done. A symptom
patched is a bug that returns.

## 5. Propose the minimal fix

Describe the smallest change that addresses the root cause. Find the real fix rather than
bypassing it: never disable a safety check, delete a test, weaken an assertion, or skip a
hook to make the error "go away". Apply the fix only if the user wants it. Confirm first
before any destructive or hard-to-reverse action.

## 6. Verify

Prove it is actually fixed:

- Re-run the original repro from step 1 — it must now pass.
- Re-run related tests and adjacent code paths to confirm you did not regress anything.
- Remove every piece of temporary instrumentation you added in step 3.

Report the root cause, the fix, and exactly what you ran to verify. If anything remains
uncertain, say so rather than declaring victory.
