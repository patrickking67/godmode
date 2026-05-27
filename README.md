# Forge

> An opinionated engine for learning, planning, building, and optimizing code with Claude Code and Codex — with persistent memory, token economics, and a live webviewer.

**Status:** design phase. See [`docs/superpowers/specs/2026-05-27-forge-design.md`](docs/superpowers/specs/2026-05-27-forge-design.md) for the full design.

## What it is

A single private plugin that consolidates the patterns Patrick uses across many repos into one cohesive surface:

- **Top-level slash commands** for every common move — `/learn`, `/guide`, `/explain`, `/agents`, `/implement`, `/develop`, `/engineer`, `/debug`, `/optimize`, `/budget`, `/tokens`, `/route`, `/dashboard`, `/memory`, `/plans`, `/review`, `/verify`, `/commit`.
- **Persistent memory** — hybrid global + per-project SQLite, FTS5-searched, with cross-session injection.
- **Token economics** — meter, prompt optimizer, cache-aware shaping, model router, budget gates, cost dashboard.
- **Live webviewer** — local Hono server + React/Tailwind SPA. Four pages: live Dashboard, Memory, Plans, Cost.
- **Dual engine** — ships `.claude-plugin/` and `.codex-plugin/` from one source.

## Install (planned)

```sh
git clone git@github.com:patrickking67/forge.git ~/Development/forge
cd ~/Development/forge
pnpm install
pnpm build
pnpm link --global              # exposes the `forge` binary on $PATH
forge install                   # wire into ~/.claude + ~/.codex
forge start                     # start the daemon
forge dashboard                 # open the webviewer
forge doctor                    # verify everything is wired
```

## License

Apache-2.0. See `LICENSE`. Third-party attribution under `THIRD_PARTY/`.
