# Usage

Godmode installs nine workflows, five subagents (Claude Code only), three hooks (Claude Code only) and ten MCP servers. Install steps are in the [README](../README.md#try-it).

## Running a workflow

In Claude Code a workflow is a slash command with the plugin namespace:

```text
/godmode:revelation
/godmode:exorcise the checkout test fails only in CI
```

In Codex, name the skill in your prompt:

```text
Use godmode:revelation to map this repo.
```

Anything you type after the name is the task. A workflow reads the repository first, so run it from the project root.

## Which workflow for which job

| You want to                          | Run          | It does                                                                 | Edits files |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------- | ----------- |
| Understand an unfamiliar repo        | `revelation` | Maps layout, entry points, data flow, conventions and risks             | No          |
| Understand one file, symbol or error | `gospel`     | Traces the real code path                                               | No          |
| Plan a change before making it       | `prophecy`   | Lists the precedent to copy, the files to touch and the commands to run | No          |
| Build or change something            | `genesis`    | Restates the goal, matches patterns, builds in small tested steps       | Yes         |
| Find out why something fails         | `exorcise`   | Reproduces, ranks hypotheses, isolates, then applies the smallest fix   | Yes         |
| Check that everything is green       | `sanctify`   | Runs the project's own checks and reports pass or fail per check        | No          |
| Review changes                       | `judgment`   | Reports bugs, security flaws and missing tests by severity              | No          |
| Commit                               | `covenant`   | Makes one Conventional Commit from the current changes                  | Commits     |
| Pick a subagent or delegate work     | `summon`     | Lists the available agents and writes the dispatch prompt               | No          |

## Example sessions

Onboard to a repo, then plan and build:

```text
/godmode:revelation
/godmode:prophecy add a --json flag to the export command
/godmode:genesis add a --json flag to the export command
/godmode:sanctify
```

Chase a failing test:

```text
/godmode:exorcise tests/billing.test.ts fails on the second run
```

Review and commit:

```text
/godmode:judgment the uncommitted changes
/godmode:covenant
```

`covenant` is manual only. Neither engine will run it on its own, and it never pushes, amends or skips hooks.

## Subagents (Claude Code)

| Agent        | Use it for                                               |
| ------------ | -------------------------------------------------------- |
| `oracle`     | Read-only reconnaissance across a large codebase         |
| `demiurge`   | A well-scoped feature or fix from a self-contained brief |
| `inquisitor` | Review of a diff or named files, read-only               |
| `arbiter`    | Running the project's checks and reporting the result    |
| `seer`       | Root-cause analysis of a bug or failing test             |

Ask `summon` which one fits and it writes the prompt. Subagents run in their own context, so a broad search returns a conclusion instead of every file it read.

## Hooks (Claude Code)

- **SessionStart** adds the workflow and subagent list to the session.
- **PreToolUse on Bash** asks for confirmation before destructive commands such as `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f` or piping a download into a shell. It asks and never blocks.
- **PostToolUse on Edit and Write** runs `prettier --write` on the edited file, only in a project that already uses Prettier.

## MCP servers

Ten servers ship and none needs a key. The list, endpoints and what each is for are in [mcp-servers.md](mcp-servers.md). To check that they all start, run `pnpm verify:mcps` in a clone of this repository.
