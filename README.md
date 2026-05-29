<div align="center">

# 🔥 Godmode

**Learn. Plan. Build. Optimize.**
One plugin for Claude Code and Codex. Battle-tested workflows and ten bundled no-auth MCP servers install today; persistent memory, token economics, and a live dashboard are on the roadmap.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.3.0-7C3AED.svg)](CHANGELOG.md)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-7C3AED)](#install)
[![Codex](https://img.shields.io/badge/Codex-supported-10B981)](#install)

</div>

---

## What is Godmode?

Godmode takes the best ideas from across the Claude Code and Codex plugin ecosystem (brainstorming, plan-driven development, subagent orchestration, persistent memory, and disciplined verification) and **fuses them into one coherent, opinionated plugin**. The curated MCP servers, commands, subagents, and hooks ship today; hybrid project and global memory and a live local dashboard are on the roadmap.

It consolidates that surface into a single super-plugin you install once, in either engine, with no per-repo setup grind.

---

## Why Godmode?

| Problem                                            | Godmode's answer                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 12 plugins doing 12 jobs with overlapping commands | One plugin, one command surface, one mental model                                                            |
| Memory that disappears every new session           | Hybrid global + per-project SQLite memory, auto-injected on session start, browseable in the dashboard       |
| No idea what each session is costing you           | Real-time token meter, prompt optimizer, cache-aware shaping, per-scope budgets, cost dashboard              |
| Codex and Claude Code drifting apart               | Dual-engine plugin built from a single source, with full parity at every release                             |
| Same setup grind every new repo                    | One marketplace install wires the same commands and MCP servers into every repo, in both engines             |
| MCP servers configured one at a time               | Curated 10-server no-auth bundle (docs, code intelligence, browser, cloud) pre-wired and opt-out, not opt-in |

---

## Highlights

**Available now: installs and runs in both engines, no daemon required:**

- **9 hero slash commands**: `/revelation`, `/gospel`, `/prophecy`, `/genesis`, `/summon`, `/judgment`, `/sanctify`, `/exorcise`, `/covenant`. Battle-tested workflow prompts, authored once and shipped to both engines.
- **5 subagents + 3 automatic hooks** _(Claude Code)_: the `oracle`, `demiurge`, `inquisitor`, `arbiter`, and `seer` subagents, plus session-start context, a destructive-command guard, and format-on-edit. Auto-discovered on install.
- **10 bundled no-auth MCP servers**: docs (Context7, Microsoft Learn, AWS Knowledge, Cloudflare Docs, Keeper Docs), code intelligence (DeepWiki, grep.app), browser automation (Playwright, Chrome DevTools), and cloud (Azure). One setup, working integrations, no API keys.
- **Dual engine, one source**: every command and MCP is authored once in `src/plugin/_sources/` and emitted for both Claude Code (`commands/` + `.mcp.json`) and Codex (`skills/` + `codex mcp add`). Subagents and hooks are Claude Code-only, since Codex has no equivalent surface.
- **Nothing to compile to use it**: no server, no database, no native dependencies for teammates. Install straight from the marketplace and go.

**On the roadmap (designed, not yet shipped):**

- **Persistent hybrid memory**: `~/.godmode/memory.db` for cross-project patterns, `.godmode/memory.db` for repo-local context, FTS5-searched, auto-injected on session start.
- **Token & credit economics**: live meter, prompt optimizer, model router, per-scope budgets, cost dashboard.
- **Live webviewer**: Hono + React/Tailwind dashboard on `127.0.0.1` for sessions, memory, plans, and cost.

See the [roadmap](#roadmap) for sequencing.

---

## Bundled MCP servers

Godmode ships these ten curated MCP servers and wires them into both engines during install:

| MCP                 | Category          | What it gives you                                                    |
| ------------------- | ----------------- | -------------------------------------------------------------------- |
| **Context7**        | Docs              | Up-to-date, version-aware docs for libraries, frameworks, SDKs, CLIs |
| **Microsoft Learn** | Docs              | Search and fetch Microsoft / Azure documentation and code samples    |
| **AWS Knowledge**   | Docs              | AWS documentation, code samples, and regional availability           |
| **Cloudflare Docs** | Docs              | Search the Cloudflare developer platform documentation               |
| **Keeper Docs**     | Docs              | Search Keeper Security documentation                                 |
| **DeepWiki**        | Code intelligence | Ask questions about any public GitHub repo's architecture and docs   |
| **grep.app**        | Code intelligence | Regex code search across a million public GitHub repositories        |
| **Playwright**      | Browser           | Drive a real browser for testing, screenshots, and verification      |
| **Chrome DevTools** | Browser           | Inspect the DOM, network, console, and performance traces in Chrome  |
| **Azure**           | Cloud             | Manage Azure resources and deployments (uses your local `az login`)  |

Every server is **no-auth**: the HTTP endpoints are public, the `npx`-based stdio servers need no API key, and Azure uses your ambient `az login` credentials. No secrets live in the config. To opt one out, remove its entry from `plugin/.mcp.json` (Claude Code) or skip its line in the Codex setup below.

---

## Install

Godmode installs from a marketplace in **both** engines with no daemon, database, or build step. Teammates install the commands and MCP servers and start working immediately. Requires Node 22+ (the `npx`-based MCPs need it) and the Claude Code or Codex CLI.

> Godmode is public at `github.com/patrickking67/godmode`, so the marketplace paths below work as written. For local development, use the **local clone** variant in each section.

### Claude Code

```text
# 1. Register the marketplace
/plugin marketplace add patrickking67/godmode

# 2. Install (commands, skills, and all ten MCP servers come wired in)
/plugin install godmode@godmode
```

`/revelation`, `/judgment`, `/exorcise`, and the rest appear in your slash-command menu; the bundled MCP servers load automatically from the plugin's `.mcp.json`. No separate MCP setup needed on Claude Code.

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
# 1. Register the marketplace (brings in the workflow skills)
codex plugin marketplace add patrickking67/godmode

# 2. Wire up the ten bundled MCP servers
codex mcp add context7        -- npx -y @upstash/context7-mcp
codex mcp add microsoft-learn --url "https://learn.microsoft.com/api/mcp"
codex mcp add aws-knowledge   --url "https://knowledge-mcp.global.api.aws"
codex mcp add cloudflare-docs --url "https://docs.mcp.cloudflare.com/mcp"
codex mcp add keeper-docs     --url "https://docs.keeper.io/~gitbook/mcp"
codex mcp add deepwiki        --url "https://mcp.deepwiki.com/mcp"
codex mcp add grep            --url "https://mcp.grep.app"
codex mcp add playwright      -- npx -y @playwright/mcp@latest
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
codex mcp add azure           -- npx -y @azure/mcp@latest server start
```

Cloned the repo? Step 2 collapses to one command: `bash plugin/codex-mcp-setup.sh`. It is generated from the same source as the list above, so it never drifts. (You can also append `plugin/codex-config.toml` to `~/.codex/config.toml`.) For a local marketplace, use `codex plugin marketplace add /absolute/path/to/godmode`.

### Verify

```sh
codex mcp list     # Codex: the ten servers are listed
```

In Claude Code, open `/plugin` to confirm **godmode** is installed and its commands are listed. In a fresh session of either engine, run `/revelation` to confirm the workflows loaded.

### Your first command

Godmode surfaces its full command list as context at the start of every session, so you can always ask "what can Godmode do here?" To dive in, point it at the current repo:

```text
/revelation this codebase and tell me how it fits together
```

---

## Commands at a glance

All nine ship today and behave identically in Claude Code and Codex:

| Pillar        | Commands                  |
| ------------- | ------------------------- |
| **Learning**  | `/revelation` · `/gospel` |
| **Guiding**   | `/prophecy`               |
| **Building**  | `/genesis` · `/summon`    |
| **Reviewing** | `/judgment` · `/sanctify` |
| **Debugging** | `/exorcise`               |
| **Git**       | `/covenant`               |

Each command is authored once in `src/plugin/_sources/commands/` and emitted as a Claude Code slash command (`plugin/commands/<name>.md`) **and** a Codex skill (`plugin/skills/<name>/SKILL.md`). Codex replaced user prompts with skills, so a single body serves both engines.

Roadmap commands (`/plans`, `/develop`, `/engineer`, `/optimize`, `/budget`, `/tokens`, `/route`, `/memory`, `/dashboard`) arrive with the memory and economics layers.

---

## Subagents & hooks _(Claude Code)_

Beyond the shared commands, Godmode ships a host of subagents and a set of automatic hooks for Claude Code. Both are auto-discovered on install. Codex has no equivalent surface, so it gets the nine skills and ten MCP servers.

### Subagents

Dispatch them directly or let `/summon` recommend the best fit for a task:

| Agent          | Role                                                            |
| -------------- | --------------------------------------------------------------- |
| **oracle**     | Read-only codebase reconnaissance: maps structure, traces flows |
| **demiurge**   | Implements a well-scoped feature or fix end-to-end              |
| **inquisitor** | Rigorous code review: bugs, security, silent failures, drift    |
| **arbiter**    | Runs the project's own checks and reports pass/fail             |
| **seer**       | Roots out the true cause of a bug or failing test               |

### Hooks

Three hooks ship wired and ready, invoking bundled Node scripts via `${CLAUDE_PLUGIN_ROOT}`:

- **Session invocation** (`SessionStart`): surfaces the command and subagent surface as context.
- **Forbidden-act guard** (`PreToolUse` on Bash): asks for confirmation before destructive commands (`rm -rf`, `git push --force`, `git reset --hard`, …). It warns and confirms; it never hard-blocks.
- **Auto-sanctify edits** (`PostToolUse` on Edit/Write): runs `prettier --write` on the changed file, but only when the project already uses prettier. A silent no-op everywhere else.

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

| Phase     | What                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| **Now**   | Shipped in v1.3.0: 9 commands, 5 subagents, 3 hooks, 10 MCP servers, dual-engine, and a site |
| **Next**  | Persistent hybrid memory: global and per-project SQLite, session injection                   |
| **Later** | Token economics (meter, optimizer, router, budgets), a live dashboard, a `godmode` CLI       |

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Issues, PRs, MCP suggestions, and skill contributions all welcome.

## Security

See [`SECURITY.md`](SECURITY.md) for reporting and the security model.

## License

Licensed under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) for the full text.
