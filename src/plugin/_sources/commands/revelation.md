---
name: revelation
description: Map an unfamiliar codebase or subsystem and explain how it fits together (layout, entry points, data flow, conventions, risks). Use when the user asks for an overview, an architecture tour or onboarding to a repo or area. For one file, symbol or error use gospel.
allowed-tools: Read, Grep, Glob
engines: both
---

Build an accurate map of this codebase, or of the area the request names, and report it
so a newcomer can find their way around. Read-only: this workflow changes nothing.

## When to use

- The user wants an overview, an architecture tour or onboarding to a repo or subsystem.
- Not for one file, symbol or error (use `gospel`), and not for a how-to plan (use `prophecy`).

## Procedure

### 1. Fix the scope

If the request names a path, feature or subsystem, stay inside it. Otherwise cover the
whole repository. State the scope in one sentence before reading anything.

### 2. Read the map before the territory

Read, in this order, whichever of these exist: the README, the agent guide (`AGENTS.md`
or `CLAUDE.md`), the package or build manifest and its scripts, the CI workflow, and the
top-level directory listing. They say what the project claims to be; the next step checks it.

### 3. Explore breadth first

Answer four questions from the code itself:

- **Shape**: top-level layout, entry points, build, test and lint commands.
- **Architecture**: the main runtime pieces and how data or control moves between them.
- **Conventions**: naming, error handling, module boundaries, test style.
- **Risk**: generated files, oversized files, dead code, TODO or FIXME clusters,
  security-sensitive paths, places where names and behavior disagree.

In a large repository, hand each question to a read-only exploration subagent if the host
offers one (godmode ships `oracle` for Claude Code) and run them in parallel. Otherwise
search first and open only the files the search points at.

### 4. Read the files that matter

Pick the three to five files that carry the design (entry point, core module, main data
type, the test that shows intended use) and read them in full.

### 5. Report

- **Summary**: one paragraph on what the project is and does.
- **Architecture map**: the major components and how they connect, as a short list or a
  small diagram.
- **Key files**: the handful to read first, each as `path:line` with one line on why.
- **Conventions**: what a contributor must follow.
- **Watch-outs**: risks and surprises, each with a `path:line`.
- **Next steps**: two or three things the user can now do.

## Stop conditions

- The scope does not exist (wrong path or name): say so, list the closest matches, stop.
- The area is too large to cover in one pass: report the top-level map, name what was
  not read, and ask which part to go deeper on.

## Verify

Before sending the report, check that every component in the architecture map and every
key file cites a `path:line` you opened, and that every command you list appears in a
manifest or CI file. Mark anything inferred from names alone as unverified.
