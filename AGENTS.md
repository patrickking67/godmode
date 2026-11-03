# Repository agent instructions

Canonical instructions for every coding agent working in this repository
(Claude Code, Cursor, GitHub Copilot, Codex). Vendor files are thin adapters
that point here. Never duplicate this content into them.

## Purpose

**Godmode** is a single super-plugin for **Claude Code and Codex**: curated MCP
servers, slash commands, subagents, skills, and hooks that install once in either
engine with no per-repo setup. Apache-2.0 licensed.

## Repository map

```
src/plugin/_sources/    THE SINGLE SOURCE OF TRUTH: every command, skill,
                        agent, hook, and MCP definition lives here
plugin/                 GENERATED: the installable plugin tree (do not hand-edit)
.claude-plugin/         GENERATED: marketplace.json catalog (do not hand-edit)
scripts/build-plugin.ts The dual-engine emitter that produces both of the above
site/                   Static site published to GitHub Pages
tests/                  vitest: plugin/, site/, and smoke.test.ts
docs/plans, docs/specs  Design notes and specifications
```

## Generated files

**`plugin/` and `.claude-plugin/marketplace.json` are generated. Never hand-edit
them.** Edit `src/plugin/_sources/`, then run:

```bash
pnpm build:plugin
```

CI runs the build and then `git add -A && git diff --cached --exit-code`, so any
drift between the sources and the committed output **fails the build**. Always
commit the regenerated output alongside a source change.

The emitter validates both the Claude and Codex manifests with ajv and exits
non-zero on any schema violation.

## Setup and validation

Package manager is **pnpm** (CI pins v9). Node **>= 22**.

```bash
pnpm install           # use --frozen-lockfile in CI
pnpm build:plugin      # regenerate plugin/ and the marketplace catalog
pnpm typecheck         # tsc --noEmit
pnpm lint              # eslint .
pnpm test              # vitest run
pnpm fmt               # prettier --write .
pnpm fmt:check         # prettier --check .
```

**Full validation before completion:**

```bash
pnpm build:plugin && git diff --exit-code && pnpm typecheck && pnpm lint && pnpm test
```

`pnpm fmt:check` is not part of CI. Run it on files you touch.

## Deploys

- Every push to `main` publishes `site/` to GitHub Pages
  (`.github/workflows/pages.yml`). Site edits go live on merge.
- Users install the plugin from `main` through `.claude-plugin/marketplace.json`,
  so a merged change to `plugin/` reaches them on their next update.

## Architecture

- **One source, two engines.** A command authored once in `src/plugin/_sources/`
  emits a Claude slash command (`plugin/commands/<name>.md`) _and_ a shared skill
  (`plugin/skills/<name>/SKILL.md`), which is Codex's equivalent surface. Keep
  authored content engine-neutral; let the emitter handle the divergence.
- **Claude-only surfaces.** Subagents (`plugin/agents/`) and hooks
  (`plugin/hooks/`) are emitted for Claude only. Do not assume they exist on the
  Codex side.
- **MCP is emitted three ways** from one definition: `plugin/.mcp.json` for
  Claude, `plugin/codex-config.toml` for Codex, and `plugin/codex-mcp-setup.sh`
  for `codex mcp add`. Change the source, never one output.

## Coding and security

- Follow existing patterns before introducing a dependency or abstraction.
- Bundled MCP servers are **remote HTTPS and no-auth**. Do not add a stdio server,
  a localhost endpoint, or a launcher (`npx`, `uvx`, Docker, a binary).
- Never commit secrets, API keys, or tokens.
- Do not weaken tests, lint, or type checks to make a change pass.

## AI configuration maintenance

- This `AGENTS.md` is canonical. Update it only when durable repository knowledge
  changes, then re-sync the thin adapters (`CLAUDE.md`,
  `.github/copilot-instructions.md`).
- Never commit `CLAUDE.local.md`, `.claude/settings.local.json`, or machine paths.
- **Attribution:** commits use only the repository owner's git identity. Never add
  Claude, Anthropic, an AI, or a bot as author, co-author, committer, trailer, or
  reviewer. No "generated with" notes.

## Definition of done

- Requested behavior is complete.
- `plugin/` was regenerated and committed; `git diff --exit-code` is clean.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass.
- Durable documentation and instructions are current.
- Commands run and unresolved risks are reported.
