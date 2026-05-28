---
name: revelation
description: Deeply explore a codebase and explain how it fits together.
allowed-tools: Task, Read, Grep, Glob, TodoWrite
engines: both
---

Build an accurate mental model of this codebase (or the area named in `$ARGUMENTS`)
and report it back so the user — and your future self — can navigate confidently.

## 1. Scope

If `$ARGUMENTS` names a path, feature, or subsystem, focus there. Otherwise survey
the whole repository. State your scope in one sentence before you start.

## 2. Explore in parallel

Do not read files one-by-one from the root. Dispatch focused exploration and let it
fan out:

- **Shape**: top-level layout, package manifests, build/test/lint scripts, entry points.
- **Architecture**: the main runtime surfaces and how data flows between them.
- **Conventions**: naming, error handling, module boundaries, test style.
- **Risk**: anything surprising — large files, dead code, TODO/FIXME, security-sensitive paths.

For a repo of any real size, launch the `Explore` agent (or several in one batch, one
per concern above) rather than reading everything yourself. Prefer breadth first, then
drill into the 3–5 files that actually matter.

## 3. Synthesize

Produce a tight report:

- **One-paragraph summary** — what this project is and does.
- **Architecture map** — the major components and how they connect (a short list or
  simple diagram, not a wall of prose).
- **Key files** — the handful worth reading first, each with a one-line "why", formatted
  as clickable `path:line` references.
- **Conventions** — the patterns a new contributor must follow.
- **Watch-outs** — risks, rough edges, or anything that would surprise someone.

## 4. Offer next steps

End with 2–3 concrete things the user is now equipped to do (e.g. "ready to add a route",
"ready to debug the failing build"). Keep the whole report skimmable — link files, don't
paste them.
