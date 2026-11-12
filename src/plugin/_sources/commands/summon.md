---
name: summon
description: List the subagents available in this session and pick the best one for a task, with the exact dispatch prompt. Use when the user asks which agent to use, wants work delegated or run in parallel, or asks what agents exist.
allowed-tools: Read, Grep, Glob
engines: both
---

Inventory the subagents this session can launch and, when the request names a task,
recommend which to dispatch and with what brief.

## When to use

- The user asks what agents exist, which one fits a task, or wants work delegated or
  parallelized.
- Not when the task is small or tightly coupled to the current conversation: do that
  in the main thread and say why.

## Procedure

### 1. Enumerate

Collect agents from every source and note where each comes from:

- **Host**: the agent types your agent-launch tool already offers.
- **Project**: agent definitions checked into the repository (for example
  `.claude/agents/*.md` or `.codex/agents/*.toml`).
- **Personal**: the same folders under the user's home directory.
- **Plugins**: agents contributed by installed plugins. In Claude Code, godmode adds
  `oracle` (read-only reconnaissance), `demiurge` (implementation), `inquisitor`
  (review), `arbiter` (runs the checks) and `seer` (root-cause debugging).

Read each definition's name and description. If the host has no subagent support, say
so and stop at step 2 with an empty list.

### 2. Summarize

Give one line per agent on what it is for, taken from its own description. Group by
source so the user can see what is built in and what the project or a plugin adds.

### 3. Recommend, if a task was given

- Name the agent and the reason it fits the shape of the task.
- Write the dispatch: the agent name and a brief that states the goal, the scope, what
  is already known and what to return. The agent sees only that brief.
- If the task splits into independent parts, propose one agent per part, launched
  together, and spell out the split.
- If no agent fits, say so and recommend the main thread.

### 4. Otherwise, present the list

With no task, show the grouped list and offer to recommend once the user describes one.

## Stop conditions

- The task writes to shared state (commits, deploys, database changes): recommend an
  agent only for the read-only or isolated part and leave the rest to the main thread.
- Two agents would edit the same files in parallel: do not propose that split.

## Verify

Every agent you list must come from a definition you read or a type the host reports,
never from memory. Check that each recommended agent has the tools its brief needs (a
read-only agent cannot be asked to edit).
