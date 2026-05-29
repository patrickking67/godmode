---
title: "Godmode: Pages Site + Hardening"
status: draft
date: 2026-05-28
owner: Patrick King
version: 1.3.0
supersedes: none
relates-to: docs/specs/2026-05-27-godmode-design.md
---

# Godmode: Pages Site + Hardening

## Summary

This is a focused, single-session improvement pass on the **shipped** Godmode plugin (the
dual-engine commands, agents, hooks, and MCP surface). It does two things:

1. **Ship a masterful GitHub Pages landing site**, rebuilt from scratch with
   `/frontend-design`, deployed from `main` now that the repo is public. This replaces the
   881-line hand-rolled `site/index.html` removed in `c55050d`, which was dropped only
   because Pages was unavailable on the then-private repo. That constraint is gone.
2. **Fix the concrete usability, compatibility, and functionality defects** surfaced by a
   three-track read-only audit, at the Critical, High, and Medium severity tiers.

It does not build any roadmap feature (persistent memory, token economics, the local web
dashboard, a CLI). Those remain future work tracked in the original design spec.

The package version is reconciled to **`1.3.0`** (owner-chosen) and every version and
maturity reference is aligned to it.

## Goals

1. A first-time installer's documented "confirm it worked" path actually works.
2. `pnpm build` succeeds from a clean clone, and CI catches source-to-artifact drift.
3. Running the test suite never mutates committed files.
4. The destructive-command guard covers the high-impact cases and is tested.
5. A polished, on-brand, accessible, responsive landing page is live at
   `https://patrickking67.github.io/godmode/` and cannot silently drift from the plugin.
6. Every bundled connector is presented with a clean, consistent human title across the
   site, the canonical data, and the README.
7. Version and maturity claims are internally consistent at `1.3.0`.

## Non-goals

- No roadmap features: no memory DB, token meter, model router, dashboard, or `godmode` CLI.
- No new engines (Gemini CLI and Cursor remain out per the original spec).
- No Low-severity polish this session (enumerated under "Deferred" below).
- No automatic push to `main`, no repo-settings changes, and no Pages enablement without the
  owner's explicit go-ahead. Implementation happens on the working branch. Deploy is a
  consequence of a later merge to `main`.

## Quality bar

The intent is "really good," not "good enough." The site must read as a distinctive,
production-grade product page, not a generic AI-generated landing template. Every fix must
leave its file better than it found it: accurate, consistent, and tested where behavior
changed. Treat the whole pass as something shippable to a public marketplace audience.

## Working principles (apply to every task and subagent)

- **Use the web connectors where possible.** Before authoring or asserting anything that
  depends on current external knowledge, consult the bundled connectors rather than relying
  on memory:
  - **Context7** for up-to-date library, framework, and CLI documentation (HTML, CSS,
    accessibility patterns, Open Graph, anything version-sensitive).
  - **DeepWiki** and **grep.app** for reference implementations and real-world patterns
    (for example, how strong open-source landing pages structure a hero or a feature grid).
  - **Playwright** or **Chrome DevTools** to load and verify the built site in a real
    browser (screenshots, interaction checks, console and accessibility inspection).
  - **Microsoft Learn**, **AWS Knowledge**, and **Cloudflare Docs** when a task touches
    those platforms.
    Prefer connector-sourced current docs over assumptions, and note in each task's output
    which connectors were used.
- **No em dashes.** Do not use the em dash character in any deliverable: site copy, Markdown
  docs, code comments, JSON content, the spec and plan themselves, or commit messages. Use a
  colon, comma, parentheses, "to" for ranges, or a separate sentence instead. Hyphens in
  identifiers and numeric ranges (for example `133-137`) are fine.
- **Single source of truth.** Anything that lists commands, agents, or connectors derives
  from one place so it cannot drift (see A2 and A4).

## Severity cut line

Fix Critical, High, and Medium. Defer Low (listed under "Deferred").

---

## Part 1: GitHub Pages site

### Design direction (brand)

Keep and elevate the existing identity:

- **Palette:** background `#0a0a0f` and `#12121a`, panels `#16161f` and `#1c1c28`, primary
  `#7C3AED`, primary-2 `#a855f7`, emerald accent `#10B981`, text `#ececf1`, muted `#9a9ab0`.
- **Type:** a system sans stack for prose
  (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, ...`) and a mono stack for
  code (`ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace`).
- **Motif:** the fire mark, the deific command lexicon, and "Learn. Plan. Build. Optimize."
- **Quality bar:** distinctive and production-grade. Considered typographic scale, real
  spacing rhythm, tasteful motion, polished hover and focus states, and a designed (not
  bullet-list) presentation of commands and connectors. Reference strong landing pages via
  the connectors above rather than defaulting to a stock layout.

### Information architecture (one page, anchored sections)

1. **Sticky nav:** brand mark plus links (Why, Commands, Connectors, Install, GitHub), a
   blurred translucent background, collapsing on mobile.
2. **Hero:** headline, one-line value proposition, dual-engine badges (Claude Code and
   Codex), a primary call to action (to Install) and a secondary one (to GitHub), and an
   animated mock of the slash-command menu rendered in CSS and JS (no screenshot dependency).
3. **Why Godmode:** the problem-to-answer pairs from the README, presented as designed cards.
4. **Commands:** the 9 deific commands grouped by pillar (Learning, Guiding, Building,
   Reviewing, Debugging, Git), each with name and one-line purpose. Rendered from canonical
   data (A2).
5. **Subagents and hooks:** the 5 subagents (oracle, demiurge, inquisitor, arbiter, seer) and
   the 3 hooks, labeled Claude-Code-only. Rendered from canonical data.
6. **Connectors:** the 10 bundled MCP servers grouped by category (Docs, Code intelligence,
   Browser, Cloud), each shown with its **clean title**, category, and a one-line blurb.
   Rendered from canonical data.
7. **Install:** tabbed Claude Code and Codex, with copy-to-clipboard code blocks that match
   the README exactly.
8. **Roadmap:** the version milestone table.
9. **Footer:** license (Apache-2.0), repo link, security link.

### Tech (buildless static)

No bundler, no framework, no CDN runtime dependency. Deployable by uploading the directory
as-is. File layout under `site/`:

```
site/
  index.html          # semantic HTML, all sections
  styles.css          # modern CSS: custom props, grid, clamp() type scale, reduced-motion
  main.js             # progressive enhancement: install tabs, copy buttons,
                      #   IntersectionObserver reveal, render lists from data
  data/godmode.json   # CANONICAL site data: commands[], agents[], hooks[], connectors[], roadmap[]
  assets/             # favicon (inline SVG fire mark), og-image, inline icons
  .nojekyll           # disable Jekyll processing on Pages
```

Constraints:

- **Relative asset paths only** (`./styles.css`, `./main.js`, `./data/godmode.json`) so the
  site works under the `/godmode/` project-page base with zero configuration.
- `main.js` fetches `./data/godmode.json` and renders the Commands, Subagents, and Connectors
  sections. Static fallback content for the no-JS case is acceptable, but the JS path is
  primary.
- Accessibility: semantic landmarks, keyboard-operable nav, tabs, and copy buttons, visible
  focus rings, color contrast at WCAG AA or better, `prefers-reduced-motion` honored, and
  meaningful alt text.
- Performance: no web fonts required (system and mono stacks), inline critical SVG, lazy
  reveal.
- Social: Open Graph and Twitter card meta, `og:url` set to the Pages URL, and an OG image
  asset.

### A2: canonical site data (anti-drift, clean titles)

`site/data/godmode.json` is the single source for the dynamic lists. Each connector entry
carries:

- `slug`: the registered MCP server key (for example `aws-knowledge`).
- `title`: the clean human display name (for example `AWS Knowledge`), consistent with the
  README table.
- `category`: one of Docs, Code intelligence, Browser, Cloud.
- `blurb`: a one-line description of what it gives you.

Commands and agents likewise carry a clean title plus their one-line purpose. This file is
the exact thing that drifted in the README after the rename, so it gets a parity test (A4).

### A3: deploy workflow

New `.github/workflows/pages.yml`, adapted from the removed one (which already uploaded
`site/` directly):

- Triggers: `push` to `main` filtered to `site/**` and the workflow file, plus
  `workflow_dispatch`.
- Permissions, scoped to this job only: `contents: read`, `pages: write`, `id-token: write`.
- Concurrency group `pages`, `cancel-in-progress: false`.
- Steps: `checkout`, then `actions/configure-pages`, then `actions/upload-pages-artifact`
  with `path: site`, then `actions/deploy-pages`. Confirm the action versions are current
  via the connectors before pinning.
- Isolated from `ci.yml`: it installs nothing and runs no plugin checks, so it cannot break
  the plugin pipeline and vice versa.

### A4: site-data parity test

`tests/site/site-data.test.ts` (vitest): assert that the command names and connector slugs in
`site/data/godmode.json` exactly equal the set the plugin actually emits (derived from
`src/plugin/_sources/commands/*.md` front-matter and `src/plugin/_sources/mcps.ts`), and that
every connector entry has a non-empty `title`, `category`, and `blurb`. Fails if the site and
the plugin disagree, or if a connector is not cleanly titled.

### A5: Pages enablement and repo homepage (GATED)

Executed only on the owner's explicit go-ahead, because they are outward-facing:

- Enable GitHub Pages with source set to GitHub Actions
  (`gh api -X PUT repos/:owner/:repo/pages` with `build_type: workflow`, or via repo
  Settings).
- Set the repo `homepageUrl` to `https://patrickking67.github.io/godmode/`.

The site, data, workflow, and tests are all produced on the working branch regardless. The
actual deploy is a consequence of merging to `main` with Pages enabled.

### Acceptance criteria (Part 1)

- Site renders correctly when served locally, verified in a real browser via the Playwright
  or Chrome DevTools connector: a full-page desktop screenshot, a mobile-width screenshot, a
  keyboard-navigation check, and an accessibility spot check. All nav anchors resolve, install
  tabs switch, copy buttons work, and lists render from `data/godmode.json`.
- Every connector shows a clean title and category on the site.
- `tests/site/site-data.test.ts` passes.
- `pages.yml` is valid workflow YAML and does not touch the plugin pipeline.
- No absolute paths that would break under `/godmode/`.

---

## Part 2: hardening backlog (Critical, High, Medium)

Each item lists severity, the concrete change, and acceptance.

### Track B: usability and docs

- **B1 [Critical] README stale command names.** `README.md:95` (`/learn`, `/review`,
  `/debug`) and `README.md:137` (`run /learn to confirm`) become the current deific names
  (`/revelation`, `/judgment`, `/exorcise`). Grep the whole README for any other old name
  from the rename map. _Accept:_ no old command name appears anywhere in `README.md`.
- **B2 [Medium] First-command quickstart.** Add a short "Your first command" block after
  Install (for example `/revelation` on the current repo) and note that Godmode auto-surfaces
  its command list at session start (the SessionStart hook). _Accept:_ block present, uses a
  real command.
- **B3 [High] Install section reflects public repo.** Drop the "assume the repo is
  published... Until then use local clone" hedge (`README.md:83`); it is public. Keep
  local-clone as an explicit dev option. Add a Claude Code line to the Verify block
  (`README.md:133-137`) so it is not Codex-only. _Accept:_ no "may not be published" hedge,
  Verify block has both engines.
- **B4 [High] CONTRIBUTING accuracy and build flow.** Fix the dead
  `src/plugin/_sources/skills/<pillar>/<name>/` path (`CONTRIBUTING.md:20`) to
  `src/plugin/_sources/commands/<name>.md`. Add a "Source of truth and build" section: edits
  go in `src/plugin/_sources/`, `pnpm build:plugin` regenerates `plugin/`, and `plugin/` is
  generated output (do not hand-edit). Remove the mandate to add tests for `src/core/` and
  `src/server/`, which do not exist. _Accept:_ every path in CONTRIBUTING resolves, build flow
  documented.
- **B5 [Medium] Authoring template.** `src/plugin/_sources/README.md:20` example
  `name: learn` becomes a current name or a `<name>` placeholder. _Accept:_ no renamed command
  in the template.
- **B6 [Medium] Shipped-vs-roadmap honesty.** Ensure `package.json` `description`, the README
  lead, and `SECURITY.md` clearly separate shipped (plugin) from roadmap (server, memory,
  dashboard). Fill or remove the `security@<owner-domain>` placeholder (`SECURITY.md:16`), and
  add a "shipped vs roadmap" note to the security model. _Accept:_ no claim implies the
  memory, dashboard, or server is installed today, no unfilled placeholder.

### Track C: compatibility, build, CI

- **C1 [Critical] Fix `pnpm build`.** `package.json:43` calls `vite build` with no vite and no
  config, so the build dies before emitting the plugin. The emitter is a `.ts` file run via
  `tsx` (the working `build:plugin` proves this), so `node scripts/build-plugin.ts` is wrong.
  Recommended: `build` = `tsx scripts/build-plugin.ts` (identical to `build:plugin`), with a
  preceding `tsc -p tsconfig.build.json` only if `dist/` is still shipped. It will not be after
  C2, so the `tsc` step should be dropped (whole-project type-checking already lives in
  `pnpm typecheck`). Net: `build` emits the plugin with no `vite` reference. _Accept:_
  `pnpm build` succeeds from a clean install, emits the plugin, and references no `vite`.
- **C2 [High] Remove phantom package entries.** `bin` (`./dist/cli/index.js`), `dev`
  (`src/cli/dev.ts`), and `doctor` (`src/cli/doctor.ts`) reference a non-existent CLI, and
  `files` ships `dist`. Remove `bin`, `dev`, `doctor`, and trim `files` to what exists and what
  an install actually needs. _Accept:_ every script in `package.json` runs, no entry points at
  a missing path.
- **C3 [High] CI drift guard.** Add a step to `.github/workflows/ci.yml` after install:
  `pnpm build:plugin && git diff --exit-code` (fails if committed `plugin/` drifts from
  `_sources/`). _Accept:_ CI fails on an intentional drift, passes when in sync.
- **C4 [Medium] Codex manifest MCP pointer.** Stop spreading `mcpServers: "./.mcp.json"` into
  the Codex manifest (`.codex-plugin/plugin.json`); Codex registers MCPs via `codex mcp add`,
  not a Claude-style pointer. Adjust the emitter (`scripts/build-plugin.ts` and
  `manifest.ts`) so only the Claude manifest carries it, then rebuild. _Accept:_ Codex manifest
  has no `mcpServers` key, Claude manifest unchanged, no drift.
- **C5 [Medium] Tighten ajv interface schema.** Add `longDescription`, `developerName`,
  `category`, and `websiteURL` to the `required` list of the Codex `interface` schema in
  `scripts/build-plugin.ts` so the runtime gate matches the `CodexInterface` type. _Accept:_
  removing any of those fields fails the build.

### Track D: functionality and correctness

- **D1 [High] `build(outDir)` parameterization.** `scripts/build-plugin.ts` hardcodes
  `PLUGIN = join(ROOT, "plugin")` and `rmSync`s it, and the build test calls `build()` in
  `beforeAll`, so `pnpm test` deletes and regenerates committed files. Make `build(outDir?,
manifestRoot?)` parameterized (default to the real paths), and have the test pass a temp dir.
  _Accept:_ running `pnpm test` leaves the working tree clean (`git diff --exit-code` after a
  test run shows nothing).
- **D2 [High] Broaden `guard-bash.mjs`.** Add rules, keeping the warn-and-confirm (never hard
  block) contract: recursive `chmod` and `chown -R`, `curl` or `wget` piped to `sh` or `bash`,
  redirects to `/dev/` and truncating `>` of existing files, `truncate -s 0`, `shred`,
  `git checkout -- .`, and `find ... -delete`. Tune to avoid noisy false positives. _Accept:_
  the new patterns are detected, the existing ones still are, warn-only behavior preserved.
- **D3 [High] Hook contract tests (first ever).** `tests/plugin/hooks.test.ts`: feed
  representative JSON on stdin to each hook and assert the output contract. `session-start`
  emits the SessionStart `additionalContext` object and exits 0, `guard-bash` warns on
  dangerous input and is silent or permissive on benign input, `format-edit` no-ops on
  non-prettier projects and on non-matching extensions. _Accept:_ tests cover all three hooks,
  including guard-bash positive and negative cases.
- **D4 [Medium] `format-edit.mjs` control flow.** Use `return done()` at all guard sites
  (malformed JSON, no or unmatched file, no project root) so flow does not depend on
  `process.exit` firing. _Accept:_ each early exit is an explicit `return`, behavior unchanged.

### Track E: version reconciliation

- **E1 [High, owner-chosen] Version to `1.3.0`.** Set `package.json` version to `1.3.0` (the
  emitter propagates to both manifests and the marketplace). Cut `CHANGELOG.md [1.3.0]`
  capturing the deific rename, the 5 subagents and 3 hooks, the Pages site, and this hardening
  pass; keep `[Unreleased]` empty or for follow-ups. Align maturity references to `1.3.0`: the
  README "Status: alpha" badge wording and the roadmap "v0.2 ... (you are here)" line, and the
  `SECURITY.md` supported-versions table. _Accept:_ one version string (`1.3.0`) across
  `package.json`, both manifests, `marketplace.json`, README, CHANGELOG, and SECURITY, with no
  "v0.2 (you are here)" or stale "alpha at 0.1" claims contradicting it.

> Sanity-check at spec review: `1.3.0` is owner-chosen ("1.3 or something"). If a different
> number is wanted, it changes only E1's target string.

---

## Testing and verification strategy

- **Unit and integration (vitest):** existing build tests (now writing to a temp dir, D1),
  new hook contract tests (D3), and the site-data parity test (A4).
- **Static checks:** `pnpm typecheck` and `pnpm lint` stay green.
- **Build:** `pnpm build` succeeds (C1), and `pnpm build:plugin && git diff --exit-code` is
  clean.
- **Drift guard:** the CI step (C3) proven by a throwaway local drift experiment.
- **Site:** served locally and verified in a real browser via the Playwright or Chrome
  DevTools connector (desktop and mobile screenshots, anchor, tab, and copy interactions,
  reduced motion, and an accessibility spot check).
- **Whole-suite gate before any "done" claim:** `pnpm typecheck && pnpm lint && pnpm test &&
pnpm build` all pass, and the working tree is clean.

## Execution model

Spec, then `writing-plans` (detailed plan in `docs/plans/2026-05-28-...`), then execute via
**subagent-driven-development**: one implementer subagent per task, then a spec-compliance
review, then a code-quality review, looping until both pass, continuously across tasks. Every
subagent receives the working principles above (use connectors, no em dashes, single source of
truth). Suggested task grouping, each independently reviewable:

1. C1 plus C2 (package.json build and phantom entries): smallest, unblocks a clean build.
2. D1 (`build(outDir)` plus temp-dir test): stops file mutation, precedes other build work.
3. C4 plus C5 (emitter: Codex MCP pointer and schema), then rebuild.
4. D2 plus D3 (guard-bash broadening and hook tests).
5. D4 (format-edit control flow).
6. C3 (CI drift guard).
7. E1 (version reconciliation across all files), then rebuild.
8. B1 to B6 (docs: README, CONTRIBUTING, SECURITY, `_sources` template).
9. A1 plus A2 (site and canonical data): the `/frontend-design` task, connector-assisted.
10. A4 (site-data parity test) plus A3 (pages.yml) plus browser verification.
11. (Gated) A5: enablement and homepageUrl, only on owner go-ahead.

## Risks and watch-outs

- **Outward-facing actions are gated.** Pages enablement, `homepageUrl`, and any push to
  `main` require explicit owner consent. The deploy is a side effect of a later merge.
- **guard-bash false positives.** Broadening risks nagging on benign commands (for example
  `chmod -R 755 ./build`). Mitigation: warn and confirm only, never block, scope patterns to
  clearly dangerous shapes, and cover both directions in tests (D3).
- **Buildless data fetch.** `main.js` fetches `./data/godmode.json`. This works on Pages (over
  HTTP) but a `file://` preview needs a static server, so document `npx serve site` or
  `python3 -m http.server` for local preview.
- **Project-page base path.** Relative paths only. Verify nothing resolves to the `/` root.
- **Version is owner-chosen.** `1.3.0` per the brainstorm. Confirm at spec review.

## Deferred (Low, explicitly out of scope this session)

parseFrontmatter multi-line and list YAML robustness; `allowed-tools` quoting in the emitter;
`packageManager` pin and CI pnpm-version alignment; `format-edit` 20s timeout tuning;
`MultiEdit` matcher cleanup; a "best-effort, not a security boundary" comment on guard-bash;
historical command names in the dated `docs/specs` and `docs/plans` artifacts; re-pointing the
README status badge's link target (it currently links to the old design spec full of renamed
commands; E1 only updates the badge's maturity wording, not its href); real README screenshots
or GIFs of the live slash-command menu (needs a live install to capture).
