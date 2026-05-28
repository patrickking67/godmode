/**
 * Single source of truth for the bundled MCP servers.
 *
 * The emitter serializes this list two ways:
 *   - Claude Code `.mcp.json`  — `{ "mcpServers": { name: { type, ... } } }`
 *   - Codex `config.toml`      — `[mcp_servers.name]` tables (`url` for http,
 *                                 `command`/`args` for stdio)
 *
 * HTTP servers are first-class in both engines (no `mcp-remote` shim needed).
 * Endpoints below are verified against working installs on the author's machine.
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
  {
    name: "playwright",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    description: "Drive a real browser for testing and verification.",
  },
];
