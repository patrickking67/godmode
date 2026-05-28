<div align="center">

# 🔥 Godmode

**Learn. Plan. Build. Optimize.**
One plugin for Claude Code and Codex. Battle-tested workflows and five bundled documentation MCPs install today — persistent memory, token economics, and a live dashboard are on the roadmap.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-alpha-green.svg)](docs/specs/2026-05-27-godmode-design.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-7C3AED)](#install)
[![Codex](https://img.shields.io/badge/Codex-supported-10B981)](#install)

</div>

---

## What is Godmode?

Godmode takes the best ideas from across the Claude Code and Codex plugin ecosystem — brainstorming, plan-driven development, subagent orchestration, persistent memory, and disciplined verification — and **fuses them into one coherent, opinionated plugin** that ships with curated MCP servers, hybrid project + global memory, and a live local web dashboard.

Built on top of two excellent upstream projects (MIT-licensed [Superpowers](https://github.com/obra/superpowers) and Apache-2.0-licensed [claude-mem](https://github.com/thedotmack/claude-mem)) and a long list of skills and patterns from across the community, Godmode consolidates and optimizes them into a single super-plugin you install once.

---

## Why Godmode?

| Problem                                            | Godmode's answer                                                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 12 plugins doing 12 jobs with overlapping commands | One plugin, one command surface, one mental model                                                                      |
| Memory that disappears every new session           | Hybrid global + per-project SQLite memory, auto-injected on session start, browseable in the dashboard                 |
| No idea what each session is costing you           | Real-time token meter, prompt optimizer, cache-aware shaping, per-scope budgets, cost dashboard                        |
| Codex and Claude Code drifting apart               | Dual-engine plugin built from a single source — full parity at every release                                           |
| Same setup grind every new repo                    | One marketplace install wires the same commands and MCP servers into every repo, in both engines                       |
| MCP servers configured one at a time               | Curated bundle (Context7, Microsoft Learn, Cloudflare Docs, Keeper Docs, Playwright) pre-wired and opt-out, not opt-in |

---

## Highlights

**Available now — installs and runs in both engines, no daemon required:**

- **9 hero slash commands** — `/learn`, `/explain`, `/guide`, `/agents`, `/implement`, `/debug`, `/review`, `/verify`, `/commit`. Battle-tested workflow prompts, authored once and shipped to both engines.
- **5 bundled documentation MCPs** — Context7, Microsoft Learn, Cloudflare Docs, Keeper Docs, Playwright. One setup, working integrations.
- **Dual engine, one source** — every command and MCP is authored once in `src/plugin/_sources/` and emitted for both Claude Code (`commands/` + `.mcp.json`) and Codex (`skills/` + `codex mcp add`). Full parity at every build.
- **Nothing to compile to use it** — no server, no database, no native dependencies for teammates. Install straight from the marketplace and go.

**On the roadmap — designed, not yet shipped:**

- **Persistent hybrid memory** — `~/.godmode/memory.db` for cross-project patterns, `.godmode/memory.db` for repo-local context, FTS5-searched, auto-injected on session start.
- **Token & credit economics** — live meter, prompt optimizer, model router, per-scope budgets, cost dashboard.
- **Live webviewer** — Hono + React/Tailwind dashboard on `127.0.0.1` for sessions, memory, plans, and cost.

See the [roadmap](#roadmap) for sequencing.

---

## Bundled MCP servers

Godmode ships these curated MCPs and wires them into both engines during install:

| MCP                 | What it gives you                                                 |
| ------------------- | ----------------------------------------------------------------- |
| **Context7**        | Up-to-date docs for libraries, frameworks, SDKs, CLIs             |
| **Microsoft Learn** | Search and fetch Microsoft / Azure documentation and code samples |
| **Cloudflare Docs** | Search Cloudflare documentation                                   |
| **Keeper Docs**     | Search Keeper Security documentation                              |
| **Playwright**      | Browser automation, screenshots, end-to-end checks                |

All five are documentation/automation servers with no embedded credentials. To opt one out, remove its entry from `plugin/.mcp.json` (Claude Code) or skip its line in the Codex setup below.

---

## Install

Godmode installs from a marketplace in **both** engines — no daemon, database, or build step. Teammates install the commands and MCP servers and start working immediately. Requires Node 22+ (the `npx`-based MCPs need it) and the Claude Code or Codex CLI.

> The GitHub paths below assume the repo is published at `github.com/patrickking67/godmode`. Until then — or for local development — use the **local clone** variant in each section.

### Claude Code

```text
# 1. Register the marketplace
/plugin marketplace add patrickking67/godmode

# 2. Install — commands, skills, and all five MCP servers come wired in
/plugin install godmode@godmode
```

`/learn`, `/review`, `/debug`, and the rest appear in your slash-command menu; the bundled MCP servers load automatically from the plugin's `.mcp.json`. No separate MCP setup needed on Claude Code.

<details><summary>From a local clone</summary>

```text
git clone https://github.com/patrickking67/godmode.git
# then, inside Claude Code (use the absolute path):
/plugin marketplace add /absolute/path/to/godmode
/plugin install godmode@godmode
```

</details>

### Codex

Codex pulls the workflow **skills** from the marketplace, then registers the MCP servers with the native `codex mcp add` CLI.

```sh
# 1. Register the marketplace — brings in the workflow skills
codex plugin marketplace add patrickking67/godmode

# 2. Wire up the five bundled MCP servers
codex mcp add context7        -- npx -y @upstash/context7-mcp
codex mcp add microsoft-learn --url "https://learn.microsoft.com/api/mcp"
codex mcp add cloudflare-docs --url "https://docs.mcp.cloudflare.com/mcp"
codex mcp add keeper-docs     --url "https://docs.keeper.io/~gitbook/mcp"
codex mcp add playwright      -- npx -y @playwright/mcp@latest
```

Cloned the repo? Step 2 collapses to one command — `bash plugin/codex-mcp-setup.sh` — generated from the same source as the list above, so it never drifts. (You can also append `plugin/codex-config.toml` to `~/.codex/config.toml`.) For a local marketplace, use `codex plugin marketplace add /absolute/path/to/godmode`.

### Verify

```sh
codex mcp list     # Codex: the five servers are listed
```

In Claude Code, open `/plugin` to confirm **godmode** is installed and its commands are listed. In a fresh session of either engine, run `/learn` to confirm the workflows loaded.

---

## Commands at a glance

All nine ship today and behave identically in Claude Code and Codex:

| Pillar        | Commands                 |
| ------------- | ------------------------ |
| **Learning**  | `/learn` · `/explain`    |
| **Guiding**   | `/guide`                 |
| **Building**  | `/implement` · `/agents` |
| **Reviewing** | `/review` · `/verify`    |
| **Debugging** | `/debug`                 |
| **Git**       | `/commit`                |

Each command is authored once in `src/plugin/_sources/commands/` and emitted as a Claude Code slash command (`plugin/commands/<name>.md`) **and** a Codex skill (`plugin/skills/<name>/SKILL.md`) — Codex replaced user prompts with skills, so a single body serves both engines.

Roadmap commands — `/plans`, `/develop`, `/engineer`, `/optimize`, `/budget`, `/tokens`, `/route`, `/memory`, `/dashboard` — arrive with the memory and economics layers.

---

## Architecture

The full Godmode is a single TypeScript package with four runtime surfaces. The **plugin** surface (commands, skills, manifests, MCP wiring) ships today; **server**, **core**, and **web** land with the roadmap features:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              Godmode                                      │
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

Full design in [`docs/specs/2026-05-27-godmode-design.md`](docs/specs/2026-05-27-godmode-design.md).

---

## Roadmap

| Version  | Milestone                                                                                     |
| -------- | --------------------------------------------------------------------------------------------- |
| **v0.1** | Design spec + scaffold                                                                        |
| **v0.2** | Dual-engine plugin: 9 commands + 5 bundled MCPs, installable in both engines _(you are here)_ |
| v0.3     | Core hybrid memory — global + per-project SQLite, FTS5, session injection                     |
| v0.4     | Token meter, prompt optimizer, model router, budgets                                          |
| v0.5     | Webviewer — Dashboard, Memory, Plans, Cost                                                    |
| v0.6     | Full CLI + `godmode doctor`                                                                   |
| v0.7     | Beta on public marketplace                                                                    |
| **v1.0** | Stable API; full test coverage; public launch                                                 |

---

Full attribution in [`NOTICE`](NOTICE) and [`THIRD_PARTY/`](THIRD_PARTY/).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues, PRs, MCP suggestions, and skill contributions all welcome.

## Security

See [`SECURITY.md`](SECURITY.md) for reporting and the security model.

## License

Licensed under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) for the full text.
