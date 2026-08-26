@AGENTS.md

# Claude Code-specific instructions

- Treat root and applicable nested `AGENTS.md` files as canonical.
- `plugin/` and `.claude-plugin/marketplace.json` are generated. Edit
  `src/plugin/_sources/` and run `pnpm build:plugin`.
- Use only remote HTTPS MCP servers; never add a stdio or localhost server.
- Do not create or rely on local or user-level configuration.
- Never place secrets in repository files.
- After durable changes, update `AGENTS.md` rather than this file.
