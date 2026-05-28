---
name: summon
description: "Summon the right subagent for a task — survey those available and dispatch the best fit."
allowed-tools: Read, Glob, Grep, Task
---

Map the specialized subagents available in this environment and, if `$ARGUMENTS`
describes a task, recommend the best-fit agent(s) and show exactly how to dispatch them.

## 1. Enumerate what's available

Gather every agent on hand from all sources:

- **Host-exposed types** — the agent types your environment already lets you launch
  (e.g. `Explore`, or whatever the `Task` tool offers).
- **Project agents** — definitions on disk at `.claude/agents/*.md`.
- **Personal agents** — definitions at `~/.claude/agents/*.md`.
- **Plugin agents** — any agents contributed by installed plugins. Godmode ships five:
  `oracle` (read-only code recon), `demiurge` (implementation), `inquisitor` (review),
  `arbiter` (test/verify judgment), and `seer` (debugging / root-cause).

Glob those paths and read each definition's frontmatter for its name and description.
De-duplicate by name; note where each one comes from.

## 2. Summarize each

For every agent, give a one-line summary of what it's best at — pulled from its
description, not invented. Group them by source (host, project, personal, plugin) so the
user can see what's built in versus what this repo adds.

## 3. Recommend for the task

If `$ARGUMENTS` names a task, pick the best-fit agent(s):

- State which agent and why it fits — match the task's shape to the agent's strength.
- Show the exact dispatch: the agent type and a tight prompt describing the goal.
- If the work splits into **independent** pieces, recommend launching multiple agents in
  a single batch so they run in parallel. Spell out the split.
- If nothing fits well, say so and suggest handling it in the main thread instead.

## 4. Otherwise, just present the list

If no task is given, present the categorized list from steps 1–2 so the user knows what's
on hand, and invite them to re-run with a task description for a recommendation.

The principle: delegate broad exploration and parallelizable, well-bounded work to
subagents; keep tightly-coupled reasoning that needs full context in the main thread.
