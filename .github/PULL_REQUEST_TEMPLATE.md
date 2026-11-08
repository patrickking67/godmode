## What changed

## Why

## How I checked it

- [ ] `pnpm build:plugin && git diff --exit-code` is clean (regenerated `plugin/` is committed)
- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm test` pass
- [ ] Tests added or updated for changed behavior in `scripts/` or `src/plugin/_sources/`
- [ ] Docs updated (README, AGENTS.md, CHANGELOG `[Unreleased]`) where behavior changed
- [ ] No secrets, tokens or personal data

## Not verified
