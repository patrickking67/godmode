<div align="center">

# 🔥 Forge

**Learn. Plan. Build. Optimize.**
One plugin for Claude Code and Codex — with persistent memory, token economics, and a live local webviewer.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-design-orange.svg)](docs/superpowers/specs/2026-05-27-forge-design.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-7C3AED)](#install)
[![Codex](https://img.shields.io/badge/Codex-supported-10B981)](#install)

</div>

---

## What is Forge?

Forge takes the best ideas from across the Claude Code and Codex plugin ecosystem — brainstorming, plan-driven development, subagent orchestration, persistent memory, and disciplined verification — and **fuses them into one coherent, opinionated plugin** that ships with curated MCP servers, hybrid project + global memory, and a live local web dashboard.

Built on top of two excellent upstream projects (MIT-licensed [Superpowers](https://github.com/obra/superpowers) and Apache-2.0-licensed [claude-mem](https://github.com/thedotmack/claude-mem)) and a long list of skills and patterns from across the community, Forge consolidates and optimizes them into a single super-plugin you install once.

---

## Why Forge?

| Problem | Forge's answer |
| --- | --- |
| 12 plugins doing 12 jobs with overlapping commands | One plugin, one command surface, one mental model |
| Memory that disappears every new session | Hybrid global + per-project SQLite memory, auto-injected on session start, browseable in the dashboard |
| No idea what each session is costing you | Real-time token meter, prompt optimizer, cache-aware shaping, per-scope budgets, cost dashboard |
| Codex and Claude Code drifting apart | Dual-engine plugin built from a single source — full parity at every release |
| Same setup grind every new repo | `forge install --local` scaffolds the right docs, hooks, and MCP wiring for any repo |
| MCP servers configured one at a time | Curated bundle (Context7, Microsoft Learn, Cloudflare Docs, Keeper Docs, Playwright) pre-wired and opt-out, not opt-in |

---

## Highlights

- **17 hero slash commands** — `/learn`, `/guide`, `/explain`, `/agents`, `/implement`, `/develop`, `/engineer`, `/debug`, `/optimize`, `/budget`, `/tokens`, `/route`, `/dashboard`, `/memory`, `/plans`, `/review`, `/verify`, `/commit`.
- **Persistent hybrid memory** — `~/.forge/memory.db` for cross-project patterns, `.forge/memory.db` for repo-local context, both FTS5-searched, both browseable in the dashboard.
- **Token & credit economics** — meter, prompt optimizer, model router (Haiku ↔ Sonnet ↔ Opus), cache-friendly prompting, budget gates, subagent dispatch cost-gate, cost dashboard.
- **Live webviewer** — Hono server on `127.0.0.1:51847` + React/Tailwind SPA. Four pages: Dashboard (live sessions + subagent timelines), Memory, Plans, Cost.
- **Dual engine, one source** — `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` built from a unified source tree; full parity.
- **Bundled MCP servers** — Context7, Microsoft Learn, Cloudflare Docs, Keeper Docs, Playwright. One install, working integrations.
- **Subagent orchestration** — parallel fan-out when tasks are independent, sequential dispatch when they share state. Cost-gated before dispatch.
- **Elite operability** — `forge doctor` diagnoses every install dimension in one command.

---

## Bundled MCP servers

Forge ships these curated MCPs pre-wired in both engines. Opt out per-server with `forge install --without <name>` or edit the generated config:

| MCP | What it gives you |
| --- | --- |
| **Context7** | Up-to-date docs for libraries, frameworks, SDKs, CLIs |
| **Microsoft Learn** | Search and fetch Microsoft / Azure documentation and code samples |
| **Cloudflare Docs** | Search Cloudflare documentation |
| **Keeper Docs** | Search Keeper Security documentation |
| **Playwright** | Browser automation, screenshots, end-to-end checks |

Add more with `forge mcp add <name> <url>` — user additions are preserved across upgrades.

---

## Install

> Forge is in **design phase** — the spec is committed, the implementation plan comes next. The install commands below describe the target experience.

```sh
# clone, build, link
git clone https://github.com/<owner>/forge.git ~/Development/forge
cd ~/Development/forge
pnpm install
pnpm build
pnpm link --global

# wire into both engines
forge install                # ~/.claude/plugins/forge + ~/.codex/plugins/forge + bundled MCPs
forge install --autostart    # optional: launchd plist (macOS) / systemd user unit (Linux)

# start the daemon + open the dashboard
forge start
forge dashboard              # opens http://127.0.0.1:51847

# verify everything is wired
forge doctor
```

Once Forge ships v0.7+, `/plugin install forge` from inside Claude Code will be the one-line path.

---

## Commands at a glance

| Pillar | Commands |
| --- | --- |
| **Learning** | `/learn` · `/explain` |
| **Guiding** | `/guide` · `/plans` |
| **Building** | `/develop` · `/engineer` · `/implement` · `/agents` |
| **Reviewing** | `/review` · `/verify` |
| **Debugging** | `/debug` |
| **Optimizing** | `/optimize` · `/budget` · `/tokens` · `/route` |
| **Memory & UI** | `/memory` · `/dashboard` |
| **Git** | `/commit` |

Every command is authored once and emitted for both Claude Code (`.claude-plugin/commands/`) and Codex (`.codex-plugin/prompts/`).

---

## Architecture

A single TypeScript package with four runtime surfaces:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              Forge                                      │
│                                                                         │
│   src/plugin     src/server     src/core      src/web                   │
│   ─────────     ──────────     ────────     ────────                    │
│   commands      Hono + ws      SQLite       React + Vite                │
│   skills        REST API       memory       Tailwind + shadcn           │
│   hooks         ingestion      tokens       Dashboard / Memory /        │
│   manifests     telemetry      router       Plans / Cost                │
│                                optimizer                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                  http://127.0.0.1:51847 (bearer-authed)
                                  │
                                  ▼
                  Browser: live dashboard + memory + plans + cost
```

Full design in [`docs/superpowers/specs/2026-05-27-forge-design.md`](docs/superpowers/specs/2026-05-27-forge-design.md).

---

## Roadmap

| Version | Milestone |
| --- | --- |
| **v0.1** | Design spec + scaffold *(you are here)* |
| v0.2 | Core memory + token meter + Claude Code plugin shipping |
| v0.3 | Webviewer Dashboard + Memory pages |
| v0.4 | Codex plugin parity |
| v0.5 | Plans + Cost pages; full CLI |
| v0.6 | Bundled MCPs polished; `forge doctor` complete |
| v0.7 | Beta on marketplace |
| **v1.0** | Stable API; full test coverage; public launch |

---

## Acknowledgements

Forge stands on the shoulders of work by:

- **[Jesse Vincent](https://github.com/obra)** — [Superpowers](https://github.com/obra/superpowers) (MIT). Brainstorming, planning, subagent-driven development, verification, debugging skills — all foundational.
- **[Alex Newman](https://github.com/thedotmack)** — [claude-mem](https://github.com/thedotmack/claude-mem) (Apache-2.0). Memory compression, observation capture, SQLite schema, hook ingestion — the persistent memory engine.
- The broader Claude Code and Codex plugin community for the patterns, MCPs, and conventions that shaped what's bundled.

Full attribution in [`NOTICE`](NOTICE) and [`THIRD_PARTY/`](THIRD_PARTY/).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues, PRs, MCP suggestions, and skill contributions all welcome.

## Security

See [`SECURITY.md`](SECURITY.md) for reporting and the security model.

## License

Licensed under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) for the full text.
