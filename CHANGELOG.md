# Changelog

All notable changes to Godmode will be documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Fixed

- The SessionStart context listed bare `/revelation`-style commands, but Claude Code runs plugin skills as `/godmode:<name>`. The context, the Codex default prompts and the `prophecy` skill now use names that resolve.
- The emitter rejects a workflow, skill, agent or MCP name that is not kebab-case or that two sources share. Before, a frontmatter name like `../x` wrote outside `plugin/` and duplicates overwrote each other silently.
- With JavaScript off, the site's hero, section heads and install steps were invisible (they started at opacity 0). The page now hides them only while JS runs, and the command cards ship as static markup with a `noscript` note.
- Social cards pointed at a relative SVG; they now use an absolute 1200x630 PNG. The tagline no longer runs off the og image, and three grey text colors were raised to WCAG AA contrast.

- Each workflow was registered twice in Claude Code (once from `commands/`, once from `skills/`), doubling its always-on context cost; Codex also migrated `commands/covenant.md` into a duplicate skill. The build now emits one shared skill per workflow, and the skill keeps its `allowed-tools`.
- The marketplace catalog no longer carries `metadata.homepage`, which `claude plugin validate --strict` flags as unknown. The description moved to the documented top-level field.
- The Codex manifest now points at `.mcp.json`, matching the documented Codex plugin format.
- ESLint and Prettier no longer walk into nested git worktrees.

### Added

- `pnpm check` (build, typecheck, lint, format check, tests), which CI now runs, and `pnpm validate:plugin` for `claude plugin validate --strict`.
- `llms.txt` at the site root and the repo root.
- `.editorconfig`, `.gitattributes`, `CODEOWNERS`, Dependabot config, issue and PR templates, and `.claude/launch.json` for a site preview on port 4103.
- Tests for source name checks, the namespaced SessionStart context, the site's no-JS fallback, the og image and `llms.txt`.
- Tests for the frontmatter parser, the MCP emitters and manifest validation, plus packaging checks: a drift comparison against a fresh build, skill frontmatter, hook script paths, version sync and MCP definitions.

### Changed

- CI runs with a read-only token and checks formatting.
- Only the site hero animates in; section labels use sentence case instead of tracked capitals.
- `AGENTS.md` rewritten: it no longer forbids the stdio servers the plugin ships, and it covers run, test, preview and ship. `CLAUDE.md` and the Copilot file are now short pointers. `CONTRIBUTING.md` and `SECURITY.md` updated to match what ships.
- README rewritten with accurate counts and install steps verified against Claude Code 2.1.319 and codex-cli 0.167.0, including the `codex plugin add` step.

## [1.3.0] - 2026-05-28

### Added

- GitHub Pages landing site (buildless static), deployed from `main`.
- Five bundled subagents (Claude Code): oracle, demiurge, inquisitor, arbiter, seer.
- Three automatic hooks (Claude Code): session-start context, a destructive-command guard, and format-on-edit.
- First hook contract tests and a site-data parity test.
- CI drift guard: `pnpm build:plugin` followed by a staged `git diff` that fails on any source-to-artifact drift.
- Clean human titles and categories for every bundled connector.

### Changed

- Renamed the nine slash commands to a deific lexicon: revelation, gospel, prophecy, genesis, summon, judgment, sanctify, exorcise, covenant.
- Broadened the destructive-command guard (recursive chmod/chown, piping downloads to a shell, raw-disk redirects, truncate, shred, find -delete, git checkout of the worktree).
- Reconciled the version to 1.3.0 across both manifests, the marketplace catalog, and the docs.
- Honest shipped-vs-roadmap framing in the README, package description, and SECURITY policy.

### Fixed

- `pnpm build` no longer references an uninstalled `vite`.
- Removed phantom `bin`, `dev`, and `doctor` entries that pointed at a non-existent CLI.
- The build test no longer mutates the committed `plugin/` tree (it builds into a temp dir).
- README quickstart now uses real command names.
- CONTRIBUTING points to the real source path and documents the build flow.
- The Codex manifest no longer advertises a Claude-style `mcpServers` pointer.

## [0.2.0] - 2026-05-28

### Added

- Dual-engine plugin, installable in both Claude Code and Codex from one source.
- 9 hero slash commands: `/learn`, `/explain`, `/guide`, `/agents`, `/implement`, `/debug`, `/review`, `/verify`, `/commit`.
- 10 bundled no-auth MCP servers: Context7, Microsoft Learn, AWS Knowledge, Cloudflare Docs, Keeper Docs, DeepWiki, grep.app, Playwright, Chrome DevTools, Azure.

### Fixed

- Plugin install failure: `repository` is now emitted as a plain URL string (Claude's schema rejects the npm-style object form).
- Bundled MCPs now load on install via an `mcpServers` pointer in the Claude Code manifest.

## [0.1.0] - 2026-05-27

### Added

- Initial design spec at `docs/specs/2026-05-27-godmode-design.md`.
- Apache-2.0 `LICENSE` and project `NOTICE` file.
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`.
- Repository scaffold (`package.json`, `tsconfig.json`, `.gitignore`).

### Design milestones in this release

- 17 hero slash commands defined: `/learn`, `/guide`, `/explain`, `/agents`, `/implement`, `/develop`, `/engineer`, `/debug`, `/optimize`, `/budget`, `/tokens`, `/route`, `/dashboard`, `/memory`, `/plans`, `/review`, `/verify`, `/commit`.
- Hybrid memory model: `~/.godmode/memory.db` (global) + `.godmode/memory.db` (per-project), FTS5-indexed.
- Token economics pillar: meter, prompt optimizer, model router, cache-friendly prompting, budget gates, cost dashboard, subagent dispatch gate.
- Webviewer: Hono + WebSocket server on `127.0.0.1:51847`, React + Vite + Tailwind + shadcn SPA, 4 pages (Dashboard / Memory / Plans / Cost).
- Dual-engine plugin manifests: `.claude-plugin/plugin.json` + `.codex-plugin/plugin.json` built from one source.
- Bundled MCP servers: Context7, Microsoft Learn, AWS Knowledge, Cloudflare Docs, Keeper Docs, DeepWiki, grep.app, Playwright, Chrome DevTools, Azure.
- Distribution roadmap to `v1.0` with marketplace listings at `v0.7`.
