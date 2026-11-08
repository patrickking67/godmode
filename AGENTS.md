# Repository agent instructions

Canonical guide for every coding agent in this repo (Claude Code, Codex, Copilot, Cursor).
`CLAUDE.md` and `.github/copilot-instructions.md` are thin pointers to this file.

## What this is

Godmode is one plugin for Claude Code and Codex, built from a single source: nine workflow
skills, five Claude Code subagents, three Claude Code hooks and ten no-auth MCP servers.
It runs no server and stores no data. Apache-2.0.

## Stack

- TypeScript (strict), run with `tsx`. Node 22 or later. pnpm (CI pins v9, lockfile v9).
- ajv for manifest validation, vitest for tests, ESLint and Prettier.
- Hook scripts are plain Node ESM (`.mjs`), no dependencies.
- The site in `site/` is buildless static HTML, CSS and one script. No framework.

## Layout

```text
src/plugin/_sources/    Single source of truth: commands/, agents/, hooks/, mcps.ts, manifest.ts
scripts/build-plugin.ts Emitter: writes plugin/ and .claude-plugin/marketplace.json
plugin/                 GENERATED installable plugin tree (do not hand-edit)
.claude-plugin/         GENERATED marketplace catalog (do not hand-edit)
site/                   GitHub Pages site: index.html, styles.css, main.js, data/, assets/, llms.txt
tests/                  vitest: plugin/ (emitter, packaging, hooks), site/ (data parity, no-JS)
docs/specs, docs/plans  Design notes. Memory, token tracking and a dashboard are roadmap only
llms.txt                Copy of site/llms.txt (a test keeps them identical)
.claude/launch.json     Preview config: static site on port 4103
```

## Run, test, preview, ship

```bash
pnpm install --frozen-lockfile   # setup (Node 22+, pnpm)
pnpm check                       # build:plugin, typecheck, lint, fmt:check, test: run before every commit
pnpm validate:plugin             # claude plugin validate --strict on catalog and plugin (needs the claude CLI)
python3 -m http.server 4103 --directory site   # preview the site at http://localhost:4103/
```

Single steps: `pnpm build:plugin`, `pnpm typecheck`, `pnpm lint`, `pnpm fmt` (write),
`pnpm fmt:check`, `pnpm test`. In Claude Code the preview is the `godmode-site` config in
`.claude/launch.json`.

CI runs `pnpm check` and then `git add -A && git diff --cached --exit-code`, so commit the
regenerated `plugin/` with any source change. To ship: work on a `feat/`, `fix/`, `docs/`
or `chore/` branch, keep `pnpm check` green, open a PR against `main`. Pushing to `main`
deploys `site/` to GitHub Pages through `.github/workflows/pages.yml`. Installs read the
committed `plugin/` straight from the default branch; there is no publish step.

## Generated files

`plugin/` and `.claude-plugin/marketplace.json` come from `pnpm build:plugin`. Edit
`src/plugin/_sources/` and commit the regenerated output in the same commit. CI rebuilds
and fails on any drift. The emitter validates both manifests with ajv and rejects
non-kebab-case or duplicate source names before it writes anything.

## Conventions

- One source, two engines. A workflow in `commands/<name>.md` becomes one shared
  `plugin/skills/<name>/SKILL.md`. Never also emit it to `plugin/commands/`: both engines
  read that folder too, so it would register twice.
- Keep workflow text engine-neutral. Refer to another workflow by name (`genesis`), not as
  `/genesis`; Claude Code runs plugin skills as `/godmode:<name>`.
- Subagents and hooks are Claude Code only. Codex ignores agents and runs plugin hooks
  only after the user trusts them.
- MCP servers are defined once in `mcps.ts` and emitted three ways: `plugin/.mcp.json`
  (both manifests point at it), `codex-config.toml` and `codex-mcp-setup.sh`.
- `site/data/godmode.json` must list exactly the shipped commands and connectors, and the
  static command cards in `site/index.html` must match it. Tests enforce both.
- Conventional Commits, one logical change per commit.

## Safety

- Bundled MCP servers need no API key or secret in config. Prefer a public HTTPS endpoint.
  The four stdio servers run a published npm package through `npx`; Azure uses the local
  `az login`. Do not add a server that needs a token, a localhost endpoint or Docker.
- Hooks must never hard-block: the Bash guard returns `ask`, the formatter is a no-op
  outside projects that already use Prettier.
- Never commit secrets, `.env` files, `CLAUDE.local.md` or `.claude/settings.local.json`.
- Do not weaken tests, lint or type checks to make a change pass.
- Commits use only the owner's git identity. No AI or bot authors, co-authors, trailers or
  "generated with" notes.

## Do not touch

- `plugin/` and `.claude-plugin/` by hand.
- `LICENSE` and `NOTICE`.
- `.github/workflows/pages.yml` deploy settings and repository settings.

## Definition of done

- The requested behavior works, with tests for changed behavior in `scripts/`,
  `src/plugin/_sources/` or `site/`.
- `plugin/` regenerated and committed; `pnpm check` passes and `git status` is clean.
- README, this file and the CHANGELOG `[Unreleased]` section match the change.
- Commands run and anything unverified are reported.
