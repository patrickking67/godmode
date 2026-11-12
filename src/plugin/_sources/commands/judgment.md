---
name: judgment
description: Review a diff for correctness bugs, security flaws, silent failures, convention drift and missing tests, and report findings by severity. Use when the user asks for a code review of uncommitted changes, a commit, a range or named files. Read-only, it never edits.
allowed-tools: Read, Grep, Glob, Bash(git status *), Bash(git diff *), Bash(git show *), Bash(git log *)
pillar: Review
engines: both
---

Review changes the way a careful senior engineer would: real problems with evidence, no
nitpicks, in the project's own idiom. Read-only: this workflow reports and changes nothing.

## When to use

- The user asks for a review of uncommitted work, a commit, a range, a branch or files.
- Not to run the checks (use `sanctify`) and not to fix what the review finds unless the
  user asks afterwards.

## Procedure

### 1. Gather the diff

- If the request names files, a commit or a range, review that.
- Otherwise review uncommitted work: `git status`, then `git diff` and `git diff --staged`.
- If the tree is clean, review the latest commit with `git show HEAD`.

State what you are reviewing in one line (for example "3 files, staged and unstaged").

### 2. Read around the hunks

For each change, read enough of the surrounding file, its callers and its tests to know
what the code did before and what depends on it. Read the repository's agent or
contributing guide for rules the change must follow.

### 3. Review in priority order

1. **Correctness**: wrong conditionals, off-by-one, unhandled cases, broken control
   flow, races, changed behavior that callers rely on.
2. **Security**: injection (shell, SQL, HTML), unvalidated input at a boundary, secrets
   in code or logs, unsafe deserialization, missing authorization, path traversal.
3. **Silent failures**: swallowed errors, empty catches, defaults that hide a bug.
4. **Conventions**: does it match the patterns already here? Do not impose new ones.
5. **Tests**: is the new behavior covered, including the edge cases the diff introduces?

### 4. Report by severity

Group findings as **Must fix**, **Should fix** and **Consider**. For each one give the
`path:line`, what is wrong, the input or state that triggers it, and a concrete fix.
End with one verdict line: `ship`, `ship with fixes` or `needs work`.

## Stop conditions

- There is nothing to review (clean tree, no commits, or the named target does not
  exist): say so and stop.
- The diff is too large to review properly in one pass: review the highest-risk files
  first, list what was not reviewed, and say so in the verdict.
- A committed secret appears in the diff: report it first, do not print its value, and
  do not attempt to rotate it or rewrite history.

## Verify

Before reporting a finding, open the cited `path:line` and confirm the code says what
you claim and that the failing case is reachable. Drop any finding you cannot support.
If the change is clean, say that plainly instead of inventing concerns.
