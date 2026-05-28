# Contributing to Godmode

Thank you for considering a contribution. Godmode welcomes issues, PRs, new skills, MCP additions, and design feedback.

## Quick start

```sh
git clone https://github.com/patrickking67/godmode.git
cd godmode
pnpm install
pnpm build
pnpm test
```

## Ways to contribute

- **File an issue** — bug reports, feature requests, MCP suggestions, design feedback. Reproduction steps + environment (OS, Node version, engine) help a lot.
- **Open a PR** — fixes, docs, tests, new skills, new commands. See "PR flow" below.
- **Add a bundled MCP** — open an issue first describing the server, the auth model, and why it earns a bundled slot (we keep the curated set tight).
- **Add a skill** — author it as a `SKILL.md` under `src/plugin/_sources/skills/<pillar>/<name>/`. Build script emits Claude + Codex variants automatically.

## PR flow

1. **Issue first for new features.** Anything > 5 files, a new pillar, a new command, or a new MCP needs an issue with brief design notes before coding starts. Bug fixes and docs PRs don't need an issue.
2. **Branch from `main`** with a descriptive name: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
3. **Tests required** for `src/core/` and `src/server/` changes. UI changes get React Testing Library component tests. `pnpm test` must pass.
4. **Conventional Commits encouraged.** Not enforced. Example: `feat(memory): add tag-based filter to /api/observations`.
5. **Draft PR welcome any time.** Mark Ready for Review when you want feedback.
6. **One approving review** required to merge. PRs squash-merge by default.

## Code style

- TypeScript everywhere. `strict: true`, `noUncheckedIndexedAccess: true`.
- Prettier + ESLint configs in repo; PRs auto-format.
- No `any` without a `// reason:` comment.
- Tests: Vitest. UI: React Testing Library. E2E: Playwright.

## License sign-off

By submitting a PR you agree your contribution is licensed under the **Apache License, Version 2.0** (the same license as the project). No separate CLA is required during the `v0.x` series; we may revisit at `v1.0`.

## No AI attribution

Commits and PRs are authored by humans. Do not add `Co-Authored-By: Claude`, `Co-Authored-By: Codex`, `Signed-off-by` for bot identities, or "Generated with X" footers. This is a project rule, not a personal preference.

## Code of conduct

Be kind, be direct, be specific. Disagreements are welcome — personal attacks aren't. The maintainers reserve the right to close issues or PRs that violate this.
