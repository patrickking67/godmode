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

export interface McpServerDef {
  /** Server key used in `.mcp.json` and `[mcp_servers.<name>]`. */
  name: string;
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
    transport: "stdio",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp"],
    description: "Up-to-date library & framework documentation, version-aware.",
  },
  {
    name: "microsoft-learn",
    transport: "http",
    url: "https://learn.microsoft.com/api/mcp",
    description: "Official Microsoft & Azure documentation search and fetch.",
  },
  {
    name: "aws-knowledge",
    transport: "http",
    url: "https://knowledge-mcp.global.api.aws",
    description: "Official AWS documentation, code samples, and regional availability.",
  },
  {
    name: "cloudflare-docs",
    transport: "http",
    url: "https://docs.mcp.cloudflare.com/mcp",
    description: "Cloudflare developer platform documentation.",
  },
  {
    name: "keeper-docs",
    transport: "http",
    url: "https://docs.keeper.io/~gitbook/mcp",
    description: "Keeper Security documentation.",
  },
  // --- Code intelligence -----------------------------------------------------
  {
    name: "deepwiki",
    transport: "http",
    url: "https://mcp.deepwiki.com/mcp",
    description: "Ask questions about any public GitHub repo's architecture and docs.",
  },
  {
    name: "grep",
    transport: "http",
    url: "https://mcp.grep.app",
    description: "Regex code search across a million public GitHub repositories.",
  },
  // --- Browser & verification ------------------------------------------------
  {
    name: "playwright",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    description: "Drive a real browser for testing and verification.",
  },
  {
    name: "chrome-devtools",
    transport: "stdio",
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@latest"],
    description: "Inspect the DOM, network, console, and performance traces in Chrome.",
  },
  // --- Cloud -----------------------------------------------------------------
  {
    name: "azure",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@azure/mcp@latest", "server", "start"],
    description: "Manage Azure resources, deployments, and services (uses local az login).",
  },
];
