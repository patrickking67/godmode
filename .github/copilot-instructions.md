# GitHub Copilot repository instructions

Before changing code:

- Read and follow the root `AGENTS.md`.
- Treat `AGENTS.md` as canonical for architecture, commands, standards, and validation.

Critical non-negotiables (repeated here because they must be direct):

- `plugin/` and `.claude-plugin/marketplace.json` are **generated**. Never
  hand-edit them. Edit `src/plugin/_sources/`, then run `pnpm build:plugin` and
  commit the regenerated output — CI fails on drift.
- Package manager is pnpm, not npm. Node >= 22.
- Bundled MCP servers are remote HTTPS and no-auth. Never add a stdio server, a
  localhost endpoint, or an `npx`/`uvx`/Docker launcher.
- Never commit secrets.
- Commits use only the repository owner's git identity. Never add an AI or bot as
  author, co-author, trailer, or reviewer.

Before completion:

- Run `pnpm build:plugin && git diff --exit-code && pnpm typecheck && pnpm lint && pnpm test`.
