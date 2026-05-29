/**
 * Single source of truth for the bundled MCP servers.
 *
 * The emitter serializes this list two ways:
 *   - Claude Code `.mcp.json`  — `{ "mcpServers": { name: { type, ... } } }`
 *   - Codex `config.toml`      — `[mcp_servers.name]` tables (`url` for http,
 *                                 `command`/`args` for stdio)
 *
 * HTTP servers are first-class in both engines (no `mcp-remote` shim needed).
 * Every server below is no-auth: HTTP endpoints are public, stdio servers run via
 * `npx` with no API key. Azure uses ambient `az login` credentials — no secret in config.
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
    args: ["-y", "@upstash/context7-mcp"],
    description: "Up-to-date library & framework documentation, version-aware.",
  },
  {
    name: "microsoft-learn",
    title: "Microsoft Learn",
    category: "Docs",
    transport: "http",
    url: "https://learn.microsoft.com/api/mcp",
    description: "Official Microsoft & Azure documentation search and fetch.",
  },
  {
    name: "aws-knowledge",
    title: "AWS Knowledge",
    category: "Docs",
    transport: "http",
    url: "https://knowledge-mcp.global.api.aws",
    description: "Official AWS documentation, code samples, and regional availability.",
  },
  {
    name: "cloudflare-docs",
    title: "Cloudflare Docs",
    category: "Docs",
    transport: "http",
    url: "https://docs.mcp.cloudflare.com/mcp",
    description: "Cloudflare developer platform documentation.",
  },
  {
    name: "keeper-docs",
    title: "Keeper Docs",
    category: "Docs",
    transport: "http",
    url: "https://docs.keeper.io/~gitbook/mcp",
    description: "Keeper Security documentation.",
  },
  // --- Code intelligence -----------------------------------------------------
  {
    name: "deepwiki",
    title: "DeepWiki",
    category: "Code intelligence",
    transport: "http",
    url: "https://mcp.deepwiki.com/mcp",
    description: "Ask questions about any public GitHub repo's architecture and docs.",
  },
  {
    name: "grep",
    title: "grep.app",
    category: "Code intelligence",
    transport: "http",
    url: "https://mcp.grep.app",
    description: "Regex code search across a million public GitHub repositories.",
  },
  // --- Browser & verification ------------------------------------------------
  {
    name: "playwright",
    title: "Playwright",
    category: "Browser",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    description: "Drive a real browser for testing and verification.",
  },
  {
    name: "chrome-devtools",
    title: "Chrome DevTools",
    category: "Browser",
    transport: "stdio",
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@latest"],
    description: "Inspect the DOM, network, console, and performance traces in Chrome.",
  },
  // --- Cloud -----------------------------------------------------------------
  {
    name: "azure",
    title: "Azure",
    category: "Cloud",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@azure/mcp@latest", "server", "start"],
    description: "Manage Azure resources, deployments, and services (uses local az login).",
  },
];
