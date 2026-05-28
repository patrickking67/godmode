---
name: explain
description: "Explain how a file, symbol, function, flow, or error works."
allowed-tools: Read, Grep, Glob, Task, WebFetch
---

Explain what `$ARGUMENTS` actually does — by reading the real code paths, not by guessing
— and report it back at the right altitude: the gist first, then the detail that matters.

## 1. Identify what you were asked about

`$ARGUMENTS` is one of: a file path, a symbol or function name, a concept, or a pasted
error or stack trace. Figure out which before doing anything else:

- **Path** — read it directly.
- **Symbol or function** — `Grep` for its definition (not just call sites) and locate it.
- **Concept** — find where it lives in this repo via `Grep`/`Glob`, then read.
- **Error or stack trace** — read top-to-bottom, find the originating frame, and open
  the file and line it points at.

If the target is genuinely ambiguous, state your best interpretation and proceed.

## 2. Trace how it actually works

Follow the real code, not what the names imply. Read the definition, then follow what it
calls, what calls it, and the data it touches — far enough to explain the behavior, no
further. For a large or cross-cutting flow, dispatch the `Explore` agent to map the path
rather than reading every file yourself. Note the actual conditionals, error handling, and
edge cases; do not paper over branches you did not read.

## 3. For library, framework, or API questions, check current docs

If the question is about a third-party library, framework, SDK, CLI, or cloud service,
your training data may be stale. Use the bundled documentation tools instead of relying on
memory: **Context7** for general libraries and frameworks, **Microsoft Learn** for
Microsoft/Azure topics. Ground the explanation in what the docs say for the version in use.

## 4. For an error, find the root cause

Do not stop at the symptom. Identify the originating frame, explain *why* it fires (the
specific state or input that triggers it), and distinguish the root cause from where it
surfaced. Then give the concrete fix — the exact change, at the exact `path:line`.

## 5. Report at the right altitude

Lead with a one- or two-sentence plain-English summary, then the detail:

- **What it is and does** — the summary, first.
- **How it works** — the real flow, step by step, with clickable `path:line` references at
  each point that matters.
- **Edge cases and gotchas** — branches, failure modes, or surprises you saw in the code.
- **The fix** (errors only) — root cause plus the concrete change to make.

Explain what the code *does*, not what it is probably *supposed* to do. If the code looks
buggy or contradicts its own naming, say so. If you could not trace part of it, say that
plainly rather than filling the gap with a guess.
