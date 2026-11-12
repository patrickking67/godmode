/**
 * Single source of truth for the bundled MCP servers.
 *
 * The emitter serializes this list three ways:
 *   - `.mcp.json`: `{ "mcpServers": { name: { type, ... } } }`, read by both engines
 *   - `codex-config.toml`: `[mcp_servers.name]` tables (`url` for http,
 *                                 `command`/`args` for stdio)
 *   - `codex-mcp-setup.sh`: one `codex mcp add` call per server
 *
 * `pnpm verify:mcps` starts every server with no credentials and lists its tools.
 * `tests/catalog.test.ts` keeps the README, the docs and the site in step with this list.
 *
 * HTTP servers are first-class in both engines (no `mcp-remote` shim needed).
 * Every server below is no-auth: HTTP endpoints are public, stdio servers run via
 * `npx` with no API key. Azure uses ambient `az login` credentials; no secret in config.
 */

export type McpTransport = "http" | "stdio";

export type McpCategory = "Docs" | "Code intelligence" | "Browser" | "Cloud";

export interface McpServerDef {
  /** Server key used in `.mcp.json` and `[mcp_servers.<name>]`. */
  name: string;
  /** Clean human display title (for example "AWS Knowledge"). */
  title: string;
  /** Grouping shown in docs and on the site. */
  category: McpCategory;
  transport: McpTransport;
  description: string;
  /** Upstream repository or documentation for the server. Shown in docs and on the site. */
  homepage: string;
  /** http only */
  url?: string;
  /** stdio only */
  command?: string;
  /** stdio only */
  args?: string[];
}

export const MCPS: McpServerDef[] = [
  // --- Documentation ---------------------------------------------------------
  {
    name: "context7",
    title: "Context7",
    category: "Docs",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp@4.6.0"],
    description: "Up-to-date library & framework documentation, version-aware.",
    homepage: "https://github.com/upstash/context7",
  },
  {
    name: "microsoft-learn",
    title: "Microsoft Learn",
    category: "Docs",
    transport: "http",
    url: "https://learn.microsoft.com/api/mcp",
    description: "Official Microsoft & Azure documentation search and fetch.",
    homepage: "https://github.com/MicrosoftDocs/mcp",
  },
  {
    name: "aws-knowledge",
    title: "AWS Knowledge",
    category: "Docs",
    transport: "http",
    url: "https://knowledge-mcp.global.api.aws",
    description: "Official AWS documentation, code samples, and regional availability.",
    homepage: "https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server",
  },
  {
    name: "cloudflare-docs",
    title: "Cloudflare Docs",
    category: "Docs",
    transport: "http",
    url: "https://docs.mcp.cloudflare.com/mcp",
    description: "Cloudflare developer platform documentation.",
    homepage: "https://github.com/cloudflare/mcp-server-cloudflare",
  },
  {
    name: "keeper-docs",
    title: "Keeper Docs",
    category: "Docs",
    transport: "http",
    url: "https://docs.keeper.io/~gitbook/mcp",
    description: "Keeper Security documentation.",
    homepage: "https://docs.keeper.io/",
  },
  // --- Code intelligence -----------------------------------------------------
  {
    name: "deepwiki",
    title: "DeepWiki",
    category: "Code intelligence",
    transport: "http",
    url: "https://mcp.deepwiki.com/mcp",
    description: "Ask questions about any public GitHub repo's architecture and docs.",
    homepage: "https://docs.devin.ai/work-with-devin/deepwiki-mcp",
  },
  {
    name: "grep",
    title: "grep.app",
    category: "Code intelligence",
    transport: "http",
    url: "https://mcp.grep.app",
    description: "Regex code search across a million public GitHub repositories.",
    homepage: "https://vercel.com/blog/grep-a-million-github-repositories-via-mcp",
  },
  // --- Browser & verification ------------------------------------------------
  {
    name: "playwright",
    title: "Playwright",
    category: "Browser",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@playwright/mcp@0.0.85"],
    description: "Drive a real browser for testing and verification.",
    homepage: "https://github.com/microsoft/playwright-mcp",
  },
  {
    name: "chrome-devtools",
    title: "Chrome DevTools",
    category: "Browser",
    transport: "stdio",
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@1.13.0"],
    description: "Inspect the DOM, network, console, and performance traces in Chrome.",
    homepage: "https://github.com/ChromeDevTools/chrome-devtools-mcp",
  },
  // --- Cloud -----------------------------------------------------------------
  {
    name: "azure",
    title: "Azure",
    category: "Cloud",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@azure/mcp@3.0.0", "server", "start"],
    description: "Manage Azure resources, deployments, and services (uses local az login).",
    homepage: "https://github.com/microsoft/mcp",
  },
];
