# Bundled MCP servers

Godmode bundles ten MCP servers. None needs an API key, a token or a config secret. Six
are public HTTPS endpoints; four are npm packages that `npx` starts on your machine.

The list is defined once in [`src/plugin/_sources/mcps.ts`](../src/plugin/_sources/mcps.ts).
The build writes it to `plugin/.mcp.json`, `plugin/codex-config.toml` and
`plugin/codex-mcp-setup.sh`, and [`tests/catalog.test.ts`](../tests/catalog.test.ts) fails
if this page, the README or the site lists anything else.

## Servers

| Name              | Transport | Endpoint or launch command             | Upstream                                                                                    |
| ----------------- | --------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `context7`        | stdio     | `npx -y @upstash/context7-mcp@4.6.0`   | [upstash/context7](https://github.com/upstash/context7)                                     |
| `microsoft-learn` | http      | `https://learn.microsoft.com/api/mcp`  | [MicrosoftDocs/mcp](https://github.com/MicrosoftDocs/mcp)                                   |
| `aws-knowledge`   | http      | `https://knowledge-mcp.global.api.aws` | [AWS Knowledge MCP Server](https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server)  |
| `cloudflare-docs` | http      | `https://docs.mcp.cloudflare.com/mcp`  | [cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)     |
| `keeper-docs`     | http      | `https://docs.keeper.io/~gitbook/mcp`  | [Keeper documentation](https://docs.keeper.io/)                                             |
| `deepwiki`        | http      | `https://mcp.deepwiki.com/mcp`         | [DeepWiki MCP](https://docs.devin.ai/work-with-devin/deepwiki-mcp)                          |
| `grep`            | http      | `https://mcp.grep.app`                 | [Grep MCP announcement](https://vercel.com/blog/grep-a-million-github-repositories-via-mcp) |
| `playwright`      | stdio     | `npx -y @playwright/mcp@0.0.85`        | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)                     |
| `chrome-devtools` | stdio     | `npx -y chrome-devtools-mcp@1.13.0`    | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) |
| `azure`           | stdio     | `npx -y @azure/mcp@3.0.0 server start` | [microsoft/mcp](https://github.com/microsoft/mcp)                                           |

## What "no-auth" means here

- The six HTTPS servers answer an MCP `initialize` and `tools/list` with no credentials.
- The four stdio servers start and list their tools with no environment variables set.
- `azure` lists its tools without signing in. Calls that touch your subscription use the
  credentials already on your machine (`az login`); nothing is stored in the plugin.
- `context7` works without a key. Upstash offers an optional key for higher rate limits;
  Godmode does not set one.
- `playwright` and `chrome-devtools` drive a browser on your machine and need one installed.

These are third-party services. What they log and how they rate-limit is up to their
operators; Godmode sends them nothing on its own.

## Verification

`pnpm verify:mcps` runs [`scripts/verify-mcps.mjs`](../scripts/verify-mcps.mjs): it reads
`plugin/.mcp.json`, starts or calls each server with no credentials, sends `initialize`
and `tools/list`, and exits non-zero if any server does not answer. It needs the network
and downloads the four npm packages, so it is not part of `pnpm check`.

Last run: 2026-11-12, Node 24.22.2, all ten answered.

```text
ok    context7           2 tools  npx -y @upstash/context7-mcp@4.6.0 4.6.0
ok    microsoft-learn    3 tools  https://learn.microsoft.com/api/mcp 1.0.0
ok    aws-knowledge      5 tools  https://knowledge-mcp.global.api.aws 1.0.0
ok    cloudflare-docs    2 tools  https://docs.mcp.cloudflare.com/mcp 0.5.0
ok    keeper-docs        4 tools  https://docs.keeper.io/~gitbook/mcp 0.28.0
ok    deepwiki           3 tools  https://mcp.deepwiki.com/mcp 4.0.2
ok    grep               1 tools  https://mcp.grep.app 0.1.0
ok    playwright        25 tools  npx -y @playwright/mcp@0.0.85 1.66.0-alpha-2026-11-09
ok    chrome-devtools   33 tools  npx -y chrome-devtools-mcp@1.13.0 1.13.0
ok    azure             69 tools  npx -y @azure/mcp@3.0.0 server start 3.0.0

all servers answered without credentials
```

Package identity was checked against the npm registry on the same date: each package's
`repository` field points at the upstream repository in the table above.

## Things to know

- The stdio packages need Node 22.12 or later (`@azure/mcp` requires Node 22,
  `chrome-devtools-mcp` requires 22.12 on the 22 line).
- The four npm packages are pinned to an exact stable version in `mcps.ts`, so an install
  runs the release that was verified here and nothing newer. `tests/catalog.test.ts`
  fails on `@latest`, any other dist-tag, a prerelease or a bare package name.
- `@azure/mcp` is pinned to `3.0.0` because its `latest` dist-tag pointed at a prerelease
  (`4.0.0-beta.7`) on 2026-11-12.
- To move a pin, check the new version on the npm registry, edit `mcps.ts`, run
  `pnpm build:plugin` and `pnpm verify:mcps`, and record the version in the CHANGELOG.
- A server is removed from the bundle if it disappears or starts requiring a key. The
  CHANGELOG records the reason.

## Adding or replacing a server

1. Edit `src/plugin/_sources/mcps.ts`. Take the URL or package name from the server's
   own repository, never from memory.
2. Run `pnpm build:plugin`, then `pnpm verify:mcps`.
3. Update the table above and the README table, then run `pnpm check`.
