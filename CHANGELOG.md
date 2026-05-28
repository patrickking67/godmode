# Changelog

All notable changes to Godmode will be documented here. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-05-27

### Added

- Initial design spec at `docs/superpowers/specs/2026-05-27-godmode-design.md`.
- Apache-2.0 `LICENSE` and project `NOTICE` file.
- `THIRD_PARTY/` attribution for vendored upstream projects:
  - [Superpowers](https://github.com/obra/superpowers) (MIT)
  - [claude-mem](https://github.com/thedotmack/claude-mem) (Apache-2.0)
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`.
- Repository scaffold (`package.json`, `tsconfig.json`, `.gitignore`).

### Design milestones in this release

- 17 hero slash commands defined: `/learn`, `/guide`, `/explain`, `/agents`, `/implement`, `/develop`, `/engineer`, `/debug`, `/optimize`, `/budget`, `/tokens`, `/route`, `/dashboard`, `/memory`, `/plans`, `/review`, `/verify`, `/commit`.
- Hybrid memory model: `~/.godmode/memory.db` (global) + `.godmode/memory.db` (per-project), FTS5-indexed.
- Token economics pillar: meter, prompt optimizer, model router, cache-friendly prompting, budget gates, cost dashboard, subagent dispatch gate.
- Webviewer: Hono + WebSocket server on `127.0.0.1:51847`, React + Vite + Tailwind + shadcn SPA, 4 pages (Dashboard / Memory / Plans / Cost).
- Dual-engine plugin manifests: `.claude-plugin/plugin.json` + `.codex-plugin/plugin.json` built from one source.
- Bundled MCP servers: Context7, Microsoft Learn, Cloudflare Docs, Keeper Docs, Playwright.
- Distribution roadmap to `v1.0` with marketplace listings at `v0.7`.
