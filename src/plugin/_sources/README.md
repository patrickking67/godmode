# Plugin source of truth

Everything in this directory is authored **once** and emitted to **both** engines
by `scripts/build-plugin.ts`. Never edit the generated `plugin/` directory by hand.

## Layout

| Source | Emits to |
| --- | --- |
| `manifest.ts` | `plugin/.claude-plugin/plugin.json`, `plugin/.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `mcps.ts` | `plugin/.mcp.json` (both engines), plus `plugin/codex-config.toml` and `plugin/codex-mcp-setup.sh` (manual Codex fallbacks) |
| `commands/<name>.md` | `plugin/skills/<name>/SKILL.md` (one shared skill that both engines load) |
| `agents/<name>.md` | `plugin/agents/<name>.md` (Claude Code subagents, copied verbatim) |
| `hooks/*` | `plugin/hooks/*` (Claude Code hooks: `hooks.json` plus its Node scripts) |
| `skills/<name>/SKILL.md` (optional) | `plugin/skills/<name>/SKILL.md` (copied verbatim; no standalone skills exist yet) |
| `assets/*` | `plugin/assets/*` (icon and logo, copied byte for byte; both manifests point at them) |

## Command source format

```markdown
---
name: revelation
description: One line shown in the slash-command menu and skill list.
allowed-tools: Read, Grep, Glob   # tools Claude Code pre-approves while the skill runs
invocation: auto     # auto | manual  (default: auto)
engines: both        # both | claude | codex  (default: both)
---

Markdown body = the actual instructions. Identical for both engines.
```

`description` is what both engines match a request against, so say what the workflow
does first and then when to use it ("Use when ..."). Keep it under 320 characters.

`allowed-tools` does not restrict anything. It pre-approves the listed tools in Claude
Code for the turn that runs the skill, so list read-only tools and narrowly scoped
commands only (`Bash(git diff *)`, never a bare `Bash`). `tests/plugin/skills.test.ts`
enforces this.

`invocation: manual` is for workflows with side effects (today: `covenant`). The build
turns it into `disable-model-invocation: true` in the skill frontmatter for Claude Code
and into `skills/<name>/agents/openai.yaml` with `allow_implicit_invocation: false` for
Codex, so neither engine starts the workflow on its own.

Every workflow body needs these sections, in order: `## When to use`, `## Procedure`
(with `### 1.` numbered steps), `## Stop conditions`, `## Verify`.

`engines` controls which artifacts are produced:

- `both` (default): one shared skill in `plugin/skills/`.
- `codex`: the same shared skill. Claude Code also scans `skills/`, so this is
  not hidden from Claude.
- `claude`: a flat `plugin/commands/<name>.md` instead. Codex migrates plugin
  commands into skills, so this is not hidden from Codex either. No workflow
  uses it today.

## Why commands become skills

Codex replaced user prompts with **skills**, and Claude Code treats skills as the
current form of slash commands. A workflow is emitted once, as a skill, and both
engines load the same file. Emitting it to `commands/` as well would register it
twice in each engine, so the build does not.
