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

`pnpm check` regenerates `plugin/` and the site catalog, then runs the typecheck, ESLint,
the Prettier check, the vitest suite and a check that the published test count is current. CI runs the same command and then fails if the build changed any
committed file.

To preview the site: `python3 -m http.server 4103 --directory site` and open
http://localhost:4103/.

## Source of truth

Everything ships from `src/plugin/_sources/`. `plugin/` and `.claude-plugin/marketplace.json`
are generated: never edit them by hand. After changing a source, run `pnpm build:plugin`
and commit the regenerated output in the same commit.

To add a workflow, create `src/plugin/_sources/commands/<name>.md`. The frontmatter needs
`name` (lowercase kebab-case), `description` (what it does, then "Use when ..."),
`allowed-tools` (read-only tools and scoped git commands only) and `pillar`. The body
needs four sections in order: `## When to use`, `## Procedure` with numbered `### 1.`
steps, `## Stop conditions` and `## Verify`. `tests/plugin/skills.test.ts` enforces all
of it. Then add the static fallback entry in `site/index.html` and a row to the README
table; the site catalog `site/data/godmode.json` is generated, so do not edit it.
[`src/plugin/_sources/README.md`](src/plugin/_sources/README.md) documents every field.

To propose a bundled MCP server, open an issue first with its URL, transport and auth
model. Bundled servers must need no API key or secret in config. The steps for adding one
are in [`docs/mcp-servers.md`](docs/mcp-servers.md).

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
