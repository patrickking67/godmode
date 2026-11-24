# Troubleshooting

## The plugin does not install

- Add the marketplace first, then install: `claude plugin marketplace add patrickking67/godmode`, then `claude plugin install godmode@godmode`. For Codex use `codex plugin marketplace add patrickking67/godmode` and `codex plugin add godmode@godmode`.
- Both engines read the committed `plugin/` folder from the default branch. There is no release to wait for, so update with the engine's marketplace update command.
- Update the CLI if the marketplace command is not recognised.

## `/godmode:<name>` is not found in Claude Code

Plugin skills are namespaced. Type `/godmode:revelation`, not `/revelation`. Run `/plugin` and confirm `godmode` is enabled, then restart the session so it reloads skills.

## Codex does not run a workflow or hook

- Name the skill in your prompt: `godmode:revelation`.
- Codex ignores the subagents. It loads plugin hooks only after you review and trust them.
- The MCP servers for Codex come from the plugin's `codex-config.toml` and `codex-mcp-setup.sh`. Read them before running the script.

## The Bash guard asked me to confirm a command

That is intended. The guard asks before destructive commands and never blocks, so answer yes to run it or no to stop. The patterns it matches are listed in `src/plugin/_sources/hooks/guard-bash.mjs`.

## Files are not formatted after an edit

The formatter hook runs `prettier --write` only in a project that already uses Prettier. Without a Prettier config or dependency it does nothing, by design.

## An MCP server does not start

- Four servers run a published npm package through `npx`, so they need Node and network access.
- Azure uses your local `az login`. Sign in first.
- The rest are public HTTPS endpoints. A corporate proxy or firewall can block them.
- In a clone of this repository, `pnpm verify:mcps` starts every server with no credentials and prints the result per server.

## Working on the repository

- **CI fails on `git diff --cached --exit-code`.** The generated `plugin/`, `.claude-plugin/marketplace.json` or `site/data/godmode.json` is out of date. Run `pnpm build:plugin` and commit the output with the source change.
- **`pnpm check` says a count is stale.** The badge, the README quality table and the site state the test count. The message names each place to update.
- **A skill test fails.** Every workflow needs a trigger in its description, the four fixed sections and numbered steps. See `tests/plugin/skills.test.ts` for the exact rule.
- **Coverage threshold fails.** `pnpm test:coverage` enforces the thresholds in `vitest.config.ts`. Add a test for the new code rather than lowering them.
- **Node version.** Node 22 or later is required. CI runs 22 and 24.
