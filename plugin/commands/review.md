---
name: review
description: "Review uncommitted (or specified) changes for bugs, security, and convention drift."
allowed-tools: Bash, Read, Grep, Glob, Task, TodoWrite
---

Review code changes the way a careful senior engineer would: catch real problems, skip
nitpicks, and respect the project's existing conventions.

## 1. Gather the diff

Determine what to review:

- If `$ARGUMENTS` names files, a commit, or a range, review that.
- Otherwise review uncommitted work: run `git status` and `git diff` (staged and
  unstaged). If the tree is clean, review the most recent commit (`git show HEAD`).

Read enough surrounding context — not just the diff hunks — to understand each change.

## 2. Review against what matters

Focus on issues with real consequences, in priority order:

1. **Correctness** — logic errors, off-by-one, wrong conditionals, unhandled cases,
   broken control flow.
2. **Security** — injection (command/SQL/XSS), unvalidated input at boundaries, secrets
   in code, unsafe deserialization, missing authz checks.
3. **Silent failures** — swallowed errors, empty catches, fallbacks that mask bugs.
4. **Conventions** — does the change follow the patterns already in this codebase?
   Match the existing style; don't impose new ones.
5. **Tests** — is new behavior covered? Are edge cases tested?

## 3. Report by severity

Group findings as **Must fix**, **Should fix**, and **Consider**. For each:

- The `path:line` location (clickable).
- What's wrong and why it matters.
- A concrete suggested fix.

Only report things you're genuinely confident about. If a change is clean, say so plainly
rather than inventing concerns. End with a one-line verdict: ship, ship-with-fixes, or
needs-work.

Do not commit, push, or modify files unless the user explicitly asks — this command reviews.
