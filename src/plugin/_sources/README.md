# Plugin source of truth

Everything in this directory is authored **once** and emitted to **both** engines
by `scripts/build-plugin.ts`. Never edit the generated `plugin/` directory by hand.

## Layout

| Source | Emits to |
| --- | --- |
| `manifest.ts` | `plugin/.claude-plugin/plugin.json`, `plugin/.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| `mcps.ts` | `plugin/.mcp.json` (Claude), `plugin/codex-config.toml` snippet (Codex) |
| `commands/<name>.md` | `plugin/commands/<name>.md` (Claude slash command) + `plugin/skills/<name>/SKILL.md` (shared skill; Codex's command equivalent) |
| `skills/<name>/SKILL.md` (optional) | `plugin/skills/<name>/SKILL.md` (copied verbatim; no standalone skills exist yet) |

## Command source format

```markdown
---
name: revelation
description: One line shown in the slash-command menu and skill list.
allowed-tools: Task, Read, Grep, Glob, TodoWrite   # Claude command frontmatter
engines: both        # both | claude | codex  (default: both)
---

Markdown body = the actual instructions. Identical for both engines.
```

`engines` controls which artifacts are produced:

- `both` (default): Claude command **and** shared skill.
- `claude`: Claude command only (e.g. relies on Claude-specific tools).
- `codex`: shared skill only.

## Why commands become skills

Codex deprecated user prompts in favor of **skills**, so a capability authored
as a command is emitted as a skill for Codex (and Claude can use either). One
body, two front-matter shapes. That's the whole trick.
