---
name: covenant
description: Create one Conventional Commit from the current changes (inspect the diff, stage explicit paths, write the message, commit as the user, confirm). Use only when the user explicitly asks to commit. Never pushes, amends or skips hooks.
allowed-tools: Read, Bash(git status *), Bash(git diff *), Bash(git log *), Bash(git branch *), Bash(git add *), Bash(git commit *)
invocation: manual
pillar: Ship
engines: both
---

Turn the current changes into one clean commit. This workflow runs only on an explicit
request to commit, and that request is the approval to create the commit. It is not
approval to push, amend or rewrite anything.

## When to use

- The user asks to commit the current work.
- Not to review the changes first (use `judgment`) or to run the checks (use `sanctify`).

## Procedure

### 1. Inspect

Run these and read the output:

- `git status`: what is staged, unstaged and untracked.
- `git diff` and `git diff --staged`: the content of the changes.
- `git log --oneline -15`: how this repository writes commit subjects.
- `git branch --show-current`: where the commit will land.

Read the repository's contributing or agent guide if it documents a commit convention;
that convention wins over the defaults below.

### 2. Decide what belongs

Group related edits. If something is already staged, treat that as the user's selection
and commit only that. If the changes are unrelated (a fix plus a separate refactor),
propose a split and commit the first group only.

### 3. Draft the message

Write `type(scope): subject`.

- **type**: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci` or `chore`,
  matching how the repository already uses them.
- **scope**: optional; use the ones the log already uses.
- **subject**: imperative, lower case, no trailing period, about 50 characters, at most 72.
- **body**: optional; say why the change was needed when the subject cannot.
- Mark a breaking change with `!` after the type or scope and a `BREAKING CHANGE:` footer.

Author the commit only as the user's configured git identity. Do not add a co-author,
a "generated with" line or any assistant or tool attribution. Add `Signed-off-by` (with
`git commit -s`) only when the repository's history or guide shows it requires sign-off.

### 4. Stage explicit paths

`git add <path>...` for the files in this commit. Do not use `git add -A` or `git add .`.
Run `git diff --staged` again and read it: this is exactly what will be committed.

### 5. Commit

Pass the message on standard input so the formatting survives:

```sh
git commit -F - <<'EOF'
fix(auth): reject expired tokens before refresh

The refresh path skipped the expiry check, so stale tokens were renewed.
EOF
```

Create a new commit. Do not use `--amend`, `--no-verify` or `--no-gpg-sign`, and do not
change `user.name`, `user.email` or signing settings.

## Stop conditions

- Nothing to commit: say so and stop.
- The staged diff contains a secret, a credential file, a private key or an `.env` file:
  do not commit. Name the file, not the value, and stop.
- A merge, rebase or cherry-pick is in progress, or files are in conflict: stop and say so.
- The current branch is the default branch and the repository's guide or history shows
  work lands through branches: say so and ask before committing.
- A pre-commit hook or commit signing fails: report the output and stop. Fix the cause
  only if the user asks; never bypass it.

## Verify

Run `git log -1 --stat` and `git status`. Confirm the subject matches what you drafted,
the files listed are the ones you staged, and nothing you meant to include is left
unstaged. Report the commit hash, the subject and the files. Do not push.
