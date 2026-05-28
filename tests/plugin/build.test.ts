import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { build } from "../../scripts/build-plugin.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLUGIN = join(ROOT, "plugin");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("build-plugin emitter", () => {
  beforeAll(() => {
    build();
  });

  it("emits both engine manifests and a marketplace catalog", () => {
    expect(existsSync(join(PLUGIN, ".claude-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(PLUGIN, ".codex-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(ROOT, ".claude-plugin", "marketplace.json"))).toBe(true);
  });

  it("uses a lowercase plugin name and the package.json version", () => {
    const claude = readJson(join(PLUGIN, ".claude-plugin", "plugin.json")) as Record<string, string>;
    const pkg = readJson(join(ROOT, "package.json")) as { version: string };
    expect(claude.name).toBe("godmode");
    expect(claude.version).toBe(pkg.version);
  });

  it("gives the Codex manifest skill/mcp pointers and an interface block", () => {
    const codex = readJson(join(PLUGIN, ".codex-plugin", "plugin.json")) as Record<string, unknown>;
    expect(codex.skills).toBe("./skills/");
    expect(codex.mcpServers).toBe("./.mcp.json");
    const iface = codex.interface as Record<string, unknown>;
    expect(iface.displayName).toBe("Godmode");
    expect(iface.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("emits each `both` command as a Claude command and a shared skill", () => {
    expect(existsSync(join(PLUGIN, "commands", "learn.md"))).toBe(true);
    expect(existsSync(join(PLUGIN, "skills", "learn", "SKILL.md"))).toBe(true);
    const cmd = readFileSync(join(PLUGIN, "commands", "learn.md"), "utf8");
    expect(cmd).toMatch(/^---\nname: learn\n/);
    expect(cmd).toContain("allowed-tools:");
  });

  it("emits Claude MCP json (typed) and a Codex TOML snippet", () => {
    const mcp = readJson(join(PLUGIN, ".mcp.json")) as { mcpServers: Record<string, { type: string; url?: string }> };
    expect(mcp.mcpServers["microsoft-learn"]).toEqual({
      type: "http",
      url: "https://learn.microsoft.com/api/mcp",
    });
    expect(mcp.mcpServers["context7"]).toMatchObject({ type: "stdio", command: "npx" });

    const toml = readFileSync(join(PLUGIN, "codex-config.toml"), "utf8");
    expect(toml).toContain("[mcp_servers.microsoft-learn]");
    expect(toml).toContain('url = "https://learn.microsoft.com/api/mcp"');
    expect(toml).toContain("[mcp_servers.context7]");
    expect(toml).toContain('command = "npx"');
  });

  it("emits a runnable Codex `mcp add` setup script for both transports", () => {
    const sh = readFileSync(join(PLUGIN, "codex-mcp-setup.sh"), "utf8");
    expect(sh).toMatch(/^#!\/usr\/bin\/env bash/);
    expect(sh).toContain('codex mcp add microsoft-learn --url "https://learn.microsoft.com/api/mcp"');
    expect(sh).toContain("codex mcp add context7 -- npx -y @upstash/context7-mcp");
  });
});
