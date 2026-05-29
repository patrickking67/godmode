# Changelog

All notable changes to Godmode will be documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

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

## [0.2.0] — 2026-05-28

### Added

- Dual-engine plugin, installable in both Claude Code and Codex from one source.
- 9 hero slash commands: `/learn`, `/explain`, `/guide`, `/agents`, `/implement`, `/debug`, `/review`, `/verify`, `/commit`.
- 10 bundled no-auth MCP servers: Context7, Microsoft Learn, AWS Knowledge, Cloudflare Docs, Keeper Docs, DeepWiki, grep.app, Playwright, Chrome DevTools, Azure.

### Fixed

- Plugin install failure: `repository` is now emitted as a plain URL string (Claude's schema rejects the npm-style object form).
- Bundled MCPs now load on install via an `mcpServers` pointer in the Claude Code manifest.

## [0.1.0] — 2026-05-27

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
