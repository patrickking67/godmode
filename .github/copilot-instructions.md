# GitHub Copilot repository instructions

Read and follow the root `AGENTS.md`. It is canonical for layout, commands, conventions and
validation.

The rules that matter most:

- `plugin/` and `.claude-plugin/marketplace.json` are generated. Edit `src/plugin/_sources/`,
  run `pnpm build:plugin` and commit the output. CI fails on drift.
- pnpm, not npm. Node 22 or later.
- Bundled MCP servers need no API key or secret in config.
- Never commit secrets. Never add an AI or bot as author, co-author or trailer.

Before completion run `pnpm check` and commit the regenerated `plugin/`.
