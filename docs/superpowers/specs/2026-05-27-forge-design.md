---
title: Forge — Design Spec
status: draft
date: 2026-05-27
owner: Patrick King
version: 0.1.0
---

# Forge — Design Spec

## Summary

Forge is a single private plugin that consolidates Patrick's day-to-day Claude Code and Codex patterns into one cohesive surface — codebase priming, plan brainstorming, subagent-driven development, persistent memory, token economics, and a live webviewer. It ships as a **dual-engine plugin** (`.claude-plugin/` + `.codex-plugin/`) built from one source, runs a local **Hono server** that holds a hybrid SQLite memory + telemetry store, and exposes a **React/Vite/Tailwind/shadcn** SPA at `http://127.0.0.1:51847` with four pages: Dashboard, Memory, Plans, Cost.

Forge is a curated consolidation of patterns and selected source from two Apache-2.0 projects — [Superpowers](https://github.com/obra/superpowers) and [claude-mem](https://github.com/thedotmack/claude-mem) — adapted and extended with original work, especially the token economics pillar and the webviewer. Forge has **zero runtime dependency** on either upstream.

## Goals

1. **One plugin, many moves.** Replace the ad-hoc mix of `/learn-codebase`, `/commit`, brainstorming, subagent dispatch, and other commands with a unified surface of ~17 top-level slash commands.
2. **Dual-engine parity.** Every command and skill works in Claude Code AND Codex with identical semantics.
3. **Persistent memory that's actually useful.** Hybrid global + per-project SQLite store, FTS5-searched, with session-start memory injection and the ability to browse/edit memory from a UI.
4. **Token economics as a first-class pillar.** Real-time meter, prompt optimizer, model router, cache-aware prompting, per-scope budgets, cost dashboard, dispatch gate.
5. **A real local app, not a CLI shim.** Hono server + React SPA running on localhost with bearer auth. Four pages with live WebSocket updates.
6. **Elite operability.** `forge doctor` tells you every install dimension at a glance. CI runs unit + integration + schema + hooks + ws + e2e + smoke.

## Non-goals

- Multi-user or networked deployment. Forge binds 127.0.0.1 only.
- Public marketplace distribution at v1. Repo is private; install is `git clone` + `forge install`.
- Gemini CLI / Cursor support at v1 (engine list locked to Claude Code + Codex; revisit later).
- Cloud-hosted memory or sync. Memory is local SQLite.
- Replacing Anthropic's billing — Forge's cost numbers are derived from API-reported token usage, not actual invoices.

## Architecture overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Forge (single Node package)                    │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │  src/plugin  │    │  src/server  │    │   src/core   │    │ src/web  │  │
│  │              │    │              │    │              │    │          │  │
│  │ commands/    │    │ Hono app +   │    │ db, memory,  │    │ React +  │  │
│  │ skills/      │───▶│ ws + REST    │───▶│ token-meter, │    │ Vite +   │  │
│  │ hooks/       │    │ + hooks      │    │ router,      │    │ Tailwind │  │
│  │              │    │ ingestion    │    │ optimizer    │    │ + shadcn │  │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘    └────┬─────┘  │
│         │                   │                   │                  │       │
│         │                   ▼                   ▼                  │       │
│         │            ┌──────────────────────────────────┐          │       │
│         │            │  ~/.forge/memory.db  (global)    │          │       │
│         │            │  .forge/memory.db    (per repo)  │          │       │
│         │            └──────────────────────────────────┘          │       │
│         │                                                          │       │
│         │            ┌──────────────────────────────────┐          │       │
│         └───────────▶│   ~/.forge/queue/*.ndjson        │          │       │
│       hook events    │   (drained by server on start)   │          │       │
│                      └──────────────────────────────────┘          │       │
│                                                                    │       │
└──────────────────────────────────────────────────────────────┬─────┴───────┘
                                                               │
                                            ┌──────────────────▼──────────┐
                                            │  http://127.0.0.1:51847     │
                                            │  Bearer-authed REST + ws    │
                                            └──────────────────┬──────────┘
                                                               │
                                            ┌──────────────────▼──────────┐
                                            │  Browser: Dashboard /       │
                                            │  Memory / Plans / Cost      │
                                            └─────────────────────────────┘
```

Three runtime surfaces, one codebase:

1. **Plugin** — installed into `~/.claude/plugins/forge/` and `~/.codex/plugins/forge/` via symlink. Provides slash commands, skills, agents, and hooks.
2. **Server** — `forge start` runs a daemonized Hono process on `127.0.0.1:51847`. Ingests hook events, manages SQLite, broadcasts WebSocket events.
3. **Web** — Vite-built static SPA served by the same server. Talks to the REST + WebSocket API.

---

## Section 1 — Directory layout + command surface

### Repository layout

```text
forge/                                  ← ~/Development/forge
├── LICENSE                             ← Apache-2.0
├── THIRD_PARTY/
│   ├── README.md                       ← attribution table
│   ├── superpowers-LICENSE             ← Apache-2.0 text from upstream
│   └── claude-mem-LICENSE              ← Apache-2.0 reference
├── README.md
├── package.json                        ← bin: { forge: "dist/cli/index.js" }
├── tsconfig.json
├── vite.config.ts
├── docs/
│   ├── superpowers/specs/              ← brainstorm → spec home
│   ├── architecture.md
│   ├── commands.md                     ← per-command reference (both engines)
│   └── memory-schema.md
├── src/
│   ├── cli/                            ← `forge` binary
│   ├── plugin/
│   │   ├── _sources/                   ← unified command/prompt sources
│   │   ├── claude/                     ← built artifacts: .claude-plugin/...
│   │   └── codex/                      ← built artifacts: .codex-plugin/...
│   ├── server/                         ← Hono app + ws + routes
│   ├── core/                           ← db, memory, token-meter, router, optimizer, budget
│   └── web/                            ← React SPA
├── scripts/
│   ├── build-plugin.ts                 ← assembles dist/.claude-plugin + dist/.codex-plugin
│   ├── install-plugin.ts               ← symlinks into ~/.claude + ~/.codex
│   ├── ingest-vendored.ts              ← one-time pull from cached upstream
│   └── seed-memory.ts                  ← optional seed observations
└── tests/                              ← Vitest unit + integration + e2e
```

### Command surface

Single-source authored in `src/plugin/_sources/<name>.md` with engine-specific frontmatter; `scripts/build-plugin.ts` emits Claude commands and Codex prompts from each.

| Command | What it does | Provenance |
| --- | --- | --- |
| `/learn` | Prime the codebase into memory — reads repo, generates observations, persists | claude-mem `/learn-codebase` |
| `/guide` | Brainstorm a feature interactively, save spec | superpowers `brainstorming` |
| `/explain` | Explain a file/function/system; pulls memory for context | original |
| `/agents` | List configured subagents; spawn ad-hoc | original |
| `/implement` | Execute a saved plan via subagent-driven dev; parallel where independent | superpowers `subagent-driven-development` |
| `/develop` | Lightweight build — code an idea without full plan/spec flow | original |
| `/engineer` | Heavy build — plan → review → tests → impl → verify → commit | superpowers (composed) |
| `/debug` | Systematic debugging — root cause first | superpowers `systematic-debugging` |
| `/optimize` | Hand code to the optimizer — perf / readability / token-efficiency | original |
| `/budget` | Set or check token/cost budget for session/project/day | original |
| `/tokens` | Cost breakdown for current session, project, or window | original |
| `/route` | Show / override the router's model pick for a task | original |
| `/dashboard` | Open the webviewer | original |
| `/memory` | Search or edit memory observations (redirects to webviewer) | claude-mem |
| `/plans` | List saved plans/specs; rerun, diff | superpowers `writing-plans` |
| `/review` | Pre-commit / pre-PR review via code-reviewer subagent | superpowers `requesting-code-review` |
| `/verify` | Run project's verify suite + capture output as evidence | superpowers `verification-before-completion` |
| `/commit` | Stage + commit per attribution rules | original (your commit-commands) |

---

## Section 2 — Skills library, hooks, memory schema

### Skills library

Organized by pillar in `src/plugin/_sources/skills/<pillar>/<name>/SKILL.md`. Build script emits to `src/plugin/claude/skills/` and `src/plugin/codex/skills/`.

```text
skills/
├── learning/        ← learn-codebase, prime-context, trace-execution-path
├── guiding/         ← brainstorming, writing-plans, critique-plan
├── building/        ← subagent-driven-development, dispatching-parallel-agents,
│                     test-driven-development, using-git-worktrees
├── reviewing/       ← requesting-code-review, verification-before-completion,
│                     silent-failure-hunter
├── debugging/       ← systematic-debugging
├── optimizing/      ← prompt-optimization, model-routing,
│                     token-budgeting, cache-friendly-prompting
├── memory/          ← observation-capture, memory-search, memory-injection
└── git/             ← commit-no-attribution, pre-pr-checklist
```

### Hooks

```text
plugin/claude/hooks/
├── session-start.json        ← inject relevant memory + budget check
├── user-prompt-submit.json   ← capture user prompt, estimate tokens
├── pre-tool-use.json         ← capture tool name + args summary
├── post-tool-use.json        ← capture output + attribute cost + push live event
└── stop.json                 ← finalize session, compress observations
```

Each hook is a thin JSON pointing at `forge ingest --event <name>`. If the server isn't running, hooks write events to `~/.forge/queue/*.ndjson`; the server drains the queue on next start. Zero loss.

Codex hooks are emitted from the same source via `scripts/build-plugin.ts` with the Codex-specific JSON schema.

### Memory schema

Two SQLite databases with identical schema:
- `~/.forge/memory.db` — global, cross-project patterns
- `.forge/memory.db` — per-repo, local observations

Both writable; queries can target one or both.

```sql
-- atomic memory units
CREATE TABLE observations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  project     TEXT,                       -- null in global DB; repo path in project DB
  type        TEXT NOT NULL,              -- decision | change | bugfix | discovery | security_note | ...
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,              -- markdown
  files       TEXT,                       -- JSON array
  tags        TEXT,                       -- JSON array
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_cents  INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_obs_project_created ON observations(project, created_at DESC);
CREATE INDEX idx_obs_session         ON observations(session_id);
CREATE INDEX idx_obs_type            ON observations(type);

-- one row per Claude/Codex session
CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,         -- ULID
  engine        TEXT NOT NULL,            -- 'claude' | 'codex'
  project       TEXT,
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  prompt_in     INTEGER DEFAULT 0,
  prompt_out    INTEGER DEFAULT 0,
  cache_hits    INTEGER DEFAULT 0,
  cache_miss    INTEGER DEFAULT 0,
  cost_cents    INTEGER DEFAULT 0,
  summary       TEXT,                     -- generated on stop hook
  budget_cents  INTEGER                   -- session cap if set
);

-- saved plans/specs
CREATE TABLE plans (
  id          TEXT PRIMARY KEY,
  project     TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL,              -- draft | approved | in-progress | done | archived
  parent_id   TEXT,                       -- for versioning
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- per-call telemetry — the live dashboard reads this
CREATE TABLE tool_calls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT NOT NULL,
  tool_name     TEXT NOT NULL,
  agent_id      TEXT,                     -- subagent id if applicable
  args_summary  TEXT,                     -- truncated, no secrets
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  cache_hit     INTEGER,                  -- 0/1
  duration_ms   INTEGER,
  status        TEXT,                     -- ok | error
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER
);

-- FTS5 over observations
CREATE VIRTUAL TABLE observations_fts USING fts5(
  title, body, tags,
  content='observations',
  content_rowid='id'
);

-- budgets (see Section 3)
CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  scope       TEXT NOT NULL,              -- 'session' | 'project' | 'day' | 'month'
  scope_key   TEXT NOT NULL,
  cap_cents   INTEGER NOT NULL,
  spent_cents INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,
  UNIQUE(scope, scope_key)
);
```

Triggers keep `observations_fts` in sync on insert/update/delete. Search ranks by BM25 + recency boost + project-match boost.

---

## Section 3 — Token & credit economics

### 3.1 Token meter
Captures token counts from `post-tool-use` hook (Claude/Codex both report usage per response). Persists to `tool_calls`; rolls up into `sessions`. Real numbers where available; `tiktoken`-style estimator only as fallback.

### 3.2 Prompt optimizer (`/optimize prompt`, skill `prompt-optimization`)
Rewrites verbose prompts into compact, cache-friendly form:
- Hoist stable content (instructions, schemas, examples) into the system prompt
- Strip redundant context ("as I mentioned earlier", restated file contents)
- Compress lists into tables; cut hedge phrases
- Detect cache-killers (timestamps/UUIDs inserted before otherwise-stable content)
- Output: rewritten prompt + diff + estimated cost delta + expected cache-hit rate

### 3.3 Model router (`/route`, skill `model-routing`)

| Task signal | Default model | Reasoning |
| --- | --- | --- |
| File listing, single-file read, simple grep | Haiku 4.5 | Cheap, instant |
| Single-file edit, format, lint fix | Haiku 4.5 | Competent here |
| Multi-file edit, refactor, plan exec | Sonnet 4.6 | Best $/quality |
| Architecture, hard debugging, novel feature | Opus 4.7 | Worth it |
| Anything in `/learn`, `/explain` | Sonnet 4.6 | Default reasoning |
| Subagent fan-out (parallel) | Haiku 4.5 workers + Sonnet 4.6 orchestrator | Cheap workers, smart conductor |

Overrides:
- Inline: `/implement --model opus`
- Policy: `/route policy <task_pattern> <model>`
- Auto-downgrade (Opus→Sonnet→Haiku) when approaching session budget cap

### 3.4 Cache-friendly prompting (skill `cache-friendly-prompting`)

Forge structures prompts to maximize Anthropic prompt-cache hits (target >90% on warm sessions):

- System prompt: stable across all calls in a session
- Tool definitions: stable, hashed and pinned per session
- Variable content (user prompt, current file state) appended *after* the cache boundary
- Up to 4 `cache_control: { type: "ephemeral" }` markers placed at: system end, tools end, memory-injection end, last-stable-user-message end

`/optimize prompt` lints any prompt against these rules and warns about cache-misses before the call goes out.

### 3.5 Budget gates (`/budget`, skill `token-budgeting`)

Per-scope cost caps in cents (stored in `budgets` table). Gates:

- **80%** of cap: webviewer cost panel turns yellow; `/tokens` shows a warning
- **100%** of cap: `pre-tool-use` hook returns soft-block — system reminder *"budget exhausted; ask user to extend or close out."* Hard block on subagent dispatch.
- **Override**: `/budget extend 500c` adds $5 to current session cap

### 3.6 Cost dashboard (webviewer Cost page)

- Cards row: today / week / month spend + cache-hit%
- Donut chart: by-model spend share
- Stacked bar: spend per day, last 14 days
- Table: most expensive sessions, drill-down to per-call detail
- Cache-hit timeline: hit% per hour, last 7 days

### 3.7 Cost-aware suggestions (subagent dispatch gate)

Before `/implement` fans out N parallel subagents, the orchestrator estimates expected cost (avg-subagent-cost × N + orchestrator overhead) and:
- > 25% of remaining session budget → warns and confirms
- > 100% → refuses; suggests sequential or fewer agents
- Otherwise proceeds silently

---

## Section 4 — Webviewer

### 4.1 Server

- **Hono** on Node 22 with `@hono/node-server`; WebSocket via `ws` at `/ws`
- Binds **`127.0.0.1` only**
- Default port `51847`, configurable via `~/.forge/config.toml`
- Daemonized: `forge start` writes PID to `~/.forge/forge.pid`, logs to `~/.forge/server.log`
- Graceful shutdown on SIGTERM: drain hook queue → close DB → close ws

### 4.2 API surface

REST:
```text
GET    /api/health                       → { ok, version, uptime, db_size }
GET    /api/sessions                     → list (filter: engine, project, since)
GET    /api/sessions/:id                 → session detail with tool_calls
POST   /api/sessions/:id/end             → manually end a stuck session
GET    /api/observations                 → search (q, project, type, tags, limit)
POST   /api/observations                 → manual add
PATCH  /api/observations/:id             → edit
DELETE /api/observations/:id             → delete
GET    /api/plans                        → list (filter: project, status)
GET    /api/plans/:id                    → detail
POST   /api/plans                        → create
PATCH  /api/plans/:id                    → edit / status
GET    /api/plans/:id/diff/:other_id     → diff two plans
GET    /api/tokens/summary               → { today, week, month, by_model, by_project }
GET    /api/tokens/sessions              → top expensive sessions
GET    /api/tokens/cache_timeline        → hit% per hour, last 7d
GET    /api/budgets                      → all budgets with usage
POST   /api/budgets                      → set or update
POST   /api/hooks                        → hook ingestion (internal, bearer required)
```

WebSocket (`/ws`):
```text
session.started      { session_id, engine, project }
session.ended        { session_id, duration_ms, cost_cents }
tool_call.started    { tool_call_id, session_id, tool_name, args_summary, agent_id? }
tool_call.ended      { tool_call_id, duration_ms, tokens_in, tokens_out, cache_hit, status }
observation.added    { observation_id, session_id, title, type }
plan.updated         { plan_id, status }
budget.warning       { scope, scope_key, spent_cents, cap_cents }
budget.exhausted     { scope, scope_key }
```

### 4.3 Frontend

```text
src/web/
├── App.tsx               ← shell with sidebar nav
├── lib/
│   ├── api.ts            ← typed fetch + zod schemas matching server
│   ├── ws.ts             ← reconnecting WebSocket client + event bus
│   └── store.ts          ← Zustand store for live state
├── components/           ← shadcn primitives (button, card, table, sheet, dialog, …)
└── pages/
    ├── Dashboard.tsx     ← live session view (landing)
    ├── Memory.tsx
    ├── Plans.tsx
    └── Cost.tsx
```

Dark by default. shadcn zinc palette + Forge accent `#FB923C` (amber/orange).

### 4.4 Pages

**Dashboard (live).** Header: engine, project, live cost, live tokens, cache-hit%. Activity panel: currently running tool + subagent mini-timelines. Recent tool-calls table (last 50, auto-scrolling). Side: current plan/spec snippet + "step N of M" if implementing.

**Memory.** Sidebar project switcher (global / repo). FTS5 search + filter chips (type, date, tags). Card list (title, type badge, project tag, date, preview). Detail sheet — full markdown, edit-in-place, delete, related observations.

**Plans.** List (title, project, status, last updated). Detail — rendered markdown spec, "rerun" button (re-dispatches via `/implement`), version history dropdown. Diff view — two plans side-by-side with unified-diff highlighting.

**Cost.** Cards (today / week / month + cache%). Donut by model. Stacked bar — spend per day, last 14d. Table — most expensive sessions, drill to detail.

### 4.5 Security

- 127.0.0.1 only
- Single shared bearer in `~/.forge/auth.token` (32 random bytes, file mode 0600) required on every API call
- Frontend reads token from same-origin `/api/_token` (only serves to same-origin GET)
- Hook ingestion uses the same bearer — plugin install sets `FORGE_TOKEN` env
- No CORS open

### 4.6 Process model

```text
forge start              → daemonize, PID file, log file
forge status             → check pid + hit /api/health
forge stop               → SIGTERM
forge dashboard          → ensure running, open browser
forge install --autostart → launchd plist (macOS) / systemd user unit (Linux)
```

---

## Section 5 — Plugin manifests, CLI, testing, vendoring

### 5.1 Claude Code manifest

`.claude-plugin/plugin.json`:
```json
{
  "name": "forge",
  "version": "0.1.0",
  "description": "Learn, plan, build, and optimize — with persistent memory and a live webviewer.",
  "author": { "name": "Patrick King" },
  "license": "Apache-2.0",
  "skills":   "./skills/",
  "commands": "./commands/",
  "agents":   "./agents/",
  "hooks":    "./hooks/hooks.json"
}
```

### 5.2 Codex manifest

`.codex-plugin/plugin.json` mirrors the claude-mem template with a richer interface block:
```json
{
  "name": "forge",
  "version": "0.1.0",
  "license": "Apache-2.0",
  "skills":     "./skills/",
  "prompts":    "./prompts/",
  "mcpServers": "./.mcp.json",
  "hooks":      "./hooks/codex-hooks.json",
  "interface": {
    "displayName": "Forge",
    "shortDescription": "Learn, plan, build, optimize — with memory and a webviewer.",
    "longDescription": "Forge consolidates codebase priming, planning, subagent-driven development, and token economics across Claude Code and Codex.",
    "developerName": "Patrick King",
    "category": "Productivity",
    "capabilities": ["Interactive", "Write"],
    "defaultPrompt": [
      "/learn — prime this codebase into Forge memory",
      "/guide <feature> — brainstorm a spec, then save it",
      "/engineer <feature> — the full loop: plan, review, build, verify, commit"
    ],
    "brandColor": "#FB923C"
  }
}
```

### 5.3 Single-source build

`scripts/build-plugin.ts`:
- Reads `src/plugin/_sources/` (commands, prompts, hooks, skills with engine-specific frontmatter)
- Generates `dist/.claude-plugin/` and `dist/.codex-plugin/`
- Validates both manifests against the engines' published JSON schemas (ajv)
- Generates `hooks.json` for Claude and `codex-hooks.json` for Codex from one declarative source

`scripts/install-plugin.ts`:
- Symlinks `dist/.claude-plugin/` → `~/.claude/plugins/forge/`
- Symlinks `dist/.codex-plugin/` → `~/.codex/plugins/forge/`
- Appends `[mcp_servers.forge]` block to `~/.codex/config.toml` if missing
- Generates `~/.forge/auth.token` (32 random bytes, 0600) if missing

### 5.4 CLI surface

| Command | What |
| --- | --- |
| `forge start` / `stop` / `status` | Daemon lifecycle |
| `forge dashboard` | Ensure running; open browser |
| `forge install` | Wire plugins into Claude + Codex |
| `forge install --autostart` | Add launchd / systemd unit |
| `forge install --local` | Wire into current repo's `.claude/` + `.codex/` |
| `forge uninstall` | Remove symlinks + autostart |
| `forge ingest --event <n>` | Internal — hooks call this |
| `forge memory search <q>` | CLI search |
| `forge memory add` | Pipe markdown to stdin to add an observation |
| `forge tokens` | Quick token/cost summary |
| `forge budget set <scope> <cents>` | Set a cap |
| `forge plans list` / `show <id>` | Plans CLI |
| `forge doctor` | Diagnose every install dimension |
| `forge ingest-vendored` | One-time: import good stuff from cached upstream |

### 5.5 Testing strategy

| Layer | Tool | Coverage |
| --- | --- | --- |
| Unit | Vitest | `core/*` — memory, token-meter, router, optimizer, budget |
| Integration | Vitest + supertest | server routes against in-memory SQLite |
| Schema | ajv | both manifests validated against engine schemas |
| Hooks | Vitest + fixture events | replay payloads, assert DB state |
| WebSocket | Vitest + ws client | subscribe → dispatch → assert |
| Frontend | Vitest + React Testing Library | per-page component tests |
| E2E | Playwright | spin server in test mode, walk all 4 pages |
| Smoke | Bash | `forge doctor` on clean install in CI sandbox |

CI: GH Actions runs unit + integration + schema + hooks + ws every push; E2E + smoke on PR-to-main only.

### 5.6 `forge ingest-vendored`

One-time importer that reads from cached upstream plugins on the local machine:
- `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/`
- `~/.claude/plugins/cache/thedotmack/claude-mem/13.2.0/`

Imports (adapted to Forge's directory + naming):

From Superpowers — `brainstorming`, `writing-plans`, `subagent-driven-development`, `dispatching-parallel-agents`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`, `verification-before-completion`, `using-git-worktrees`, `executing-plans`, `finishing-a-development-branch`.

From claude-mem — `learn-codebase`, `mem-search`, `observation_add`/`observation_search`, the SQLite migration logic, the compression pipeline (PreCompact summarization).

License notices preserved in `THIRD_PARTY/`.

---

## Open questions

1. **Tokenizer source.** Anthropic's API reports token counts per response. For *pre-call* estimation (used by `/budget` and the dispatch gate), use `@anthropic-ai/tokenizer`? Or a cheaper heuristic (word-count × 1.3)?
2. **Compression triggers.** claude-mem compresses on PreCompact + Stop. Forge should match. Confirm both hook events are reliably emitted by both engines in current versions.
3. **MCP server bundle.** Does Forge ship its *own* MCP server (so external tools can query memory) at v1, or defer? Lean: defer to v0.2.
4. **Auto-start UX.** macOS launchd requires a path quirks dance. Worth shipping `--autostart` at v1, or wait for v0.2?
5. **Spec versioning.** When `/implement` re-runs an old plan and the codebase has moved, what does Forge do? Probably warn + diff against last-known-state. Detail in implementation plan.

## Out-of-scope for v1

- Gemini CLI and Cursor support
- Public marketplace distribution
- Cloud memory sync
- Multi-user / team sharing
- Custom embedding / vector search (FTS5 only at v1)
- Native installer (npm tarball, Homebrew formula)

## Glossary

- **Engine** — Claude Code or Codex (the runtime hosting the plugin).
- **Session** — one Claude Code / Codex session, identified by ULID.
- **Observation** — atomic memory unit (markdown body + metadata).
- **Plan / spec** — saved planning artifact, versioned with parent pointers.
- **Hook** — Claude/Codex lifecycle event that fires user-defined commands.
- **Cache hit** — Anthropic prompt-cache hit on a given request; tracked per call.
- **Budget** — per-scope cost cap in cents (`session`, `project`, `day`, `month`).
