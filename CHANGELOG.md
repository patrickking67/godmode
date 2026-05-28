# Changelog

All notable changes to Godmode will be documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

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
