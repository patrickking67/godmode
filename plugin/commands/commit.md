---
name: commit
description: "Craft and create a Conventional Commit from your current changes."
allowed-tools: Bash, Read
---

Turn the current changes into one clean, well-described commit. Running this command
IS the user's explicit request to create a commit — proceed without asking again.

## 1. Inspect state

Run these in parallel to understand what changed and how this repo writes commits:

- `git status` — what is staged, unstaged, and untracked.
- `git diff` and `git diff --staged` — the actual content of the changes.
- `git log` — recent messages, so you match the repo's existing style and prefixes.

Read enough of the diff to understand the intent, not just the surface edits.

## 2. Analyze and group

Decide what belongs in this commit. Group related edits together. If the changes are
clearly unrelated — say a bug fix plus an unrelated refactor — recommend splitting them
into separate commits and propose how, rather than bundling everything into one.

## 3. Draft the message

Write a Conventional Commit: `type(scope): subject`.

- **type**: one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test` (match repo usage).
- **subject**: concise, imperative, focused on the why — not a file list.
- **body** (optional): a short paragraph only when the change needs context or rationale.

Author the commit ONLY as the user's configured git identity. NEVER add a co-author,
`Co-Authored-By`, `Signed-off-by`, a "Generated with" or "Created by" line, or any
AI, assistant, or bot attribution or trailer of any kind.

## 4. Stage the right files

Add the relevant files by name. Avoid `git add -A` and `git add .` — they sweep in
noise and secrets. Never stage `.env`, credential files, keys, or other secrets; if the
user explicitly asks to commit such a file, warn them clearly before doing so.

## 5. Create the commit

Pass the message via a heredoc so formatting stays clean:

```
git commit -F - <<'EOF'
fix(auth): reject expired tokens before refresh

Refresh path skipped the expiry check, letting stale tokens through.
EOF
```

Create a NEW commit. Never use `--amend` unless the user explicitly asks. Never push.
Never use `--no-verify` or otherwise skip hooks — if a pre-commit hook fails, fix the
underlying issue, re-stage, and make a new commit rather than bypassing it.

## 6. Confirm

Run `git status` and `git log -1` to show the result. Report the commit subject and
which files landed in one tight summary.
