---
name: gospel
description: Explain how one file, symbol, function, flow or error works by tracing the real code path. Use when the user asks what something does, why an error fires or how a value gets from one place to another. For a whole-repo overview use revelation; to fix a failure use exorcise.
allowed-tools: Read, Grep, Glob
engines: both
---

Explain what the target in the request does by reading the code that runs, then report
the gist first and the detail after. Read-only: this workflow changes nothing.

## When to use

- The user asks what a file, symbol, function, flow or error message does or means.
- Not for a whole-repo overview (use `revelation`) and not to fix a failure (use `exorcise`).

## Procedure

### 1. Identify the target

Decide which of these the request is, and act on it:

- **Path**: read the file.
- **Symbol or function**: search for its definition, not only its call sites.
- **Concept or flow**: search for where it lives in this repository, then read.
- **Error or stack trace**: find the frame in this codebase closest to the failure and
  open that file and line.

If two readings are plausible, state the one you chose and continue.

### 2. Trace the real path

Read the definition, what it calls, what calls it and the data it touches, far enough to
explain the behavior and no further. Record the conditionals, error handling and edge
cases you saw. Do not describe a branch you did not read.

### 3. Check current docs for third-party behavior

If the answer depends on a library, framework, SDK, CLI or cloud service, look it up
rather than trusting memory. Find the installed version in the lockfile or manifest, then
query the bundled documentation servers when they are connected: Context7 for general
libraries, Microsoft Learn for Microsoft and Azure, AWS Knowledge for AWS, Cloudflare Docs
for Cloudflare. If none is connected, say the claim comes from memory.

### 4. For an error, separate cause from symptom

Name the state or input that triggers the error and where that state was created, which
is often not where the error surfaced. Give the change that would fix it as a
`path:line` and a one-line description. Do not apply it.

### 5. Report

- **What it is**: one or two plain sentences.
- **How it works**: the flow, step by step, with a `path:line` at each step.
- **Edge cases**: branches, failure modes and surprises you saw in the code.
- **Fix** (errors only): root cause and the change to make.

Describe what the code does, not what its names suggest. If it looks wrong, say so.

## Stop conditions

- The target cannot be found: report what you searched for and the nearest matches, stop.
- Part of the path lives outside the repository (a binary, a remote service, a
  dependency without source): explain up to that boundary and name it.

## Verify

Every step in "How it works" must cite a `path:line` you opened. Re-read the cited line
for the two or three claims the answer depends on most. Label anything you could not
trace as not verified instead of filling the gap.
