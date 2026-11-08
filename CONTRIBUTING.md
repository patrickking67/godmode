# Contributing to Godmode

Issues and pull requests are welcome: bug fixes, docs, tests, new workflows and MCP
suggestions. `AGENTS.md` has the full layout and conventions; this page is the short
version.

## Setup

Requires Node 22 or later and pnpm.

```sh
git clone https://github.com/patrickking67/godmode.git
cd godmode
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` regenerates `plugin/`, then runs the typecheck, ESLint, the Prettier check and
the vitest suite. CI runs the same command and then fails if the build changed any
committed file.

To preview the site: `python3 -m http.server 4103 --directory site` and open
http://localhost:4103/.

## Source of truth

Everything ships from `src/plugin/_sources/`. `plugin/` and `.claude-plugin/marketplace.json`
are generated: never edit them by hand. After changing a source, run `pnpm build:plugin`
and commit the regenerated output in the same commit.

To add a workflow, create `src/plugin/_sources/commands/<name>.md` with `name`,
`description` and optional `allowed-tools` frontmatter. Names are lowercase kebab-case.
Add it to `site/data/godmode.json` and the static cards in `site/index.html` too; a test
checks both.

To propose a bundled MCP server, open an issue first with its URL, transport and auth
model. Bundled servers must need no API key or secret in config.

## Branches and commits

- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `chore/<topic>`.
- Use [Conventional Commits](https://www.conventionalcommits.org/), for example
  `fix(build): reject duplicate skill names`. One logical change per commit.
- Open an issue before a new feature that touches more than a few files.

## PR checklist

- [ ] `pnpm check` passes and `git status` is clean after it
- [ ] Tests added or updated for changed behavior in `scripts/`, `src/plugin/_sources/` or `site/`
- [ ] README, `AGENTS.md` and the CHANGELOG `[Unreleased]` section updated where behavior changed
- [ ] No secrets, tokens or personal data

## Code style

- TypeScript with `strict` and `noUncheckedIndexedAccess`. No `any` without a comment saying why.
- Prettier and ESLint configs are in the repo; run `pnpm fmt` to format.
- Plain, short prose in docs. No em dashes.

## License

By submitting a PR you agree your contribution is licensed under the Apache License,
Version 2.0, the same license as the project.

## No AI attribution

Do not add `Co-Authored-By` lines for AI tools, bot sign-offs or "Generated with" footers
to commits, PRs or files.

## Conduct

Be kind, direct and specific. Personal attacks are not welcome, and issues or PRs that
include them may be closed.
