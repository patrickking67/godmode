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
src/plugin/_sources/    Single source of truth: commands/, agents/, hooks/, assets/, mcps.ts,
                        manifest.ts, site.ts. Its README documents every frontmatter field
scripts/build-plugin.ts Emitter: writes plugin/, the marketplace catalog and the site catalog
scripts/verify-mcps.mjs Live check of the bundled servers (network; not in pnpm check)
scripts/check-claims.mjs Fails pnpm check when a published test count is stale
plugin/                 GENERATED installable plugin tree (do not hand-edit)
.claude-plugin/         GENERATED marketplace catalog (do not hand-edit)
site/                   GitHub Pages site: index.html, styles.css, main.js, assets/, llms.txt
site/data/godmode.json  GENERATED catalog the site renders (do not hand-edit)
tests/                  vitest: plugin/ (emitters, packaging, hooks, skill lint), catalog parity,
                        site/ (static fallback, no-JS, llms.txt, theme tokens and contrast,
                        and main.js run against a small fake DOM: copy, tabs, theme, menu)
docs/                   architecture.md, mcp-servers.md, assets/ (screenshots, og-image source)
docs/specs, docs/plans  Design notes. Memory, token tracking and a dashboard are roadmap only
llms.txt                Copy of site/llms.txt (a test keeps them identical)
.claude/launch.json     Preview config: static site on port 4103
```

## Run, test, preview, ship

```bash
pnpm install --frozen-lockfile   # setup (Node 22+, pnpm)
pnpm check                       # build:plugin, typecheck, lint, fmt:check, tests, check-claims: run before every commit
pnpm validate:plugin             # claude plugin validate --strict on catalog and plugin (needs the claude CLI)
pnpm verify:mcps                 # starts all ten servers with no credentials (needs the network)
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

`plugin/`, `.claude-plugin/marketplace.json` and `site/data/godmode.json` come from
`pnpm build:plugin`. Edit `src/plugin/_sources/` and commit the regenerated output in the
same commit. CI rebuilds
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
- Every workflow has a description with a "Use when" trigger and four sections in order:
  When to use, Procedure (numbered steps), Stop conditions, Verify. Do not use `$ARGUMENTS`
  or engine-specific tool names in a workflow body. `tests/plugin/skills.test.ts` enforces it.
- `allowed-tools` pre-approves tools in Claude Code; it does not restrict them. List only
  `Read`, `Grep`, `Glob` and scoped git commands such as `Bash(git diff *)`. A workflow with
  side effects sets `invocation: manual`.
- The static fallback markup in `site/index.html` (workflow list, server table, demo steps)
  must match the generated catalog, and the README and docs must list the same servers and
  counts as the sources. `tests/site/` and `tests/catalog.test.ts` enforce both.
- The site has a dark and a light theme, both driven by the tokens at the top of
  `site/styles.css`. Put colors in tokens, never in rules, and give a new token a light
  value in both light blocks. `tests/site/theme.test.ts` checks the two blocks match and
  that text tokens meet WCAG AA on their surfaces. Code blocks stay dark in both themes.
- The README badge, the README quality table and the site state the test count. When it
  changes, `pnpm check` fails and names the places to update.
- Icons: edit `src/plugin/_sources/assets/icon.svg`, then regenerate the PNGs with
  `rsvg-convert` (icon.png 128, logo.png 512, site/assets/apple-touch-icon.png 180) and copy
  the SVG to `site/assets/favicon.svg`.
- Conventional Commits, one logical change per commit.

## Safety

- Bundled MCP servers need no API key or secret in config. Prefer a public HTTPS endpoint.
  The four stdio servers run a published npm package through `npx`; Azure uses the local
  `az login`. Take a package name or URL from the server's own repository, then run
  `pnpm verify:mcps`. Do not add a server that needs a token, a localhost endpoint or Docker.
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
