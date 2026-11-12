---
name: prophecy
description: Write a step-by-step plan for doing a task in this repository without changing any files (the precedent to copy, the files to touch, the commands to run). Use when the user asks how to do something here or wants a plan before building. To make the change use genesis.
allowed-tools: Read, Grep, Glob
pillar: Plan
engines: both
---

Produce a how-to for the task in the request that is specific to this repository: real
files, real conventions, real commands. This workflow plans; it does not edit files or
run builds.

## When to use

- The user asks how to do something in this codebase, or wants a plan to review first.
- Not when they want the change made (use `genesis`) or code explained (use `gospel`).

## Procedure

### 1. Find the precedent

Find the closest thing that already exists and read it in full: an existing route for
"add a route", a passing test of the same kind for "add a test". From it, extract
naming, file placement, registration or wiring, error handling and how it is tested.
If nothing similar exists, say so and base the plan on the nearest neighbor.

### 2. Find the real commands

Read the build, test, lint and run commands from the package manifest, Makefile, task
runner config or CI workflow. Never write a command the repository does not define.

### 3. Check current docs for library specifics

If the task depends on a library, framework or tool, confirm syntax and options against
current documentation for the installed version. Use the bundled documentation servers
when they are connected (Context7, Microsoft Learn, AWS Knowledge, Cloudflare Docs).
If none is connected, mark those details as from memory.

### 4. Write the plan

Number the steps. Each step names:

- the file to create or change, as a `path:line` reference to the precedent or the
  insertion point;
- the change, following the convention found in step 1;
- any wiring the precedent revealed: registration, exports, config, fixtures, generated
  files to rebuild.

Leave out steps that would apply to any repository. If a step applies only in some
cases, say when.

### 5. End with commands and a success check

List the commands to run, in order, copy-paste ready. State how to tell it worked: which
test passes, what output appears, what the result looks like.

## Stop conditions

- The task is ambiguous in a way that changes the plan (two possible targets, an
  unstated requirement): ask one question and wait.
- The task conflicts with a documented repository rule (agent guide, contributing guide,
  generated-file policy): say so and plan the compliant route.

## Verify

Check that every file path in the plan exists (or is marked as new), every command
appears in a manifest or CI file, and no step says to edit a generated file. Do not run
the build or edit anything; hand back the plan.
