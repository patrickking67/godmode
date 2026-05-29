import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build, type BuildResult } from "../../scripts/build-plugin.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("build-plugin emitter", () => {
  let result: BuildResult;
  let TMP: string;
  let PLUGIN: string;
  let MARKETPLACE: string;

  beforeAll(() => {
    TMP = mkdtempSync(join(tmpdir(), "gm-build-"));
    PLUGIN = join(TMP, "plugin");
    MARKETPLACE = join(TMP, ".claude-plugin");
    result = build({ outDir: PLUGIN, marketplaceDir: MARKETPLACE });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("emits both engine manifests and a marketplace catalog", () => {
    expect(existsSync(join(PLUGIN, ".claude-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(PLUGIN, ".codex-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(MARKETPLACE, "marketplace.json"))).toBe(true);
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
    expect(existsSync(join(PLUGIN, "commands", "revelation.md"))).toBe(true);
    expect(existsSync(join(PLUGIN, "skills", "revelation", "SKILL.md"))).toBe(true);
    const cmd = readFileSync(join(PLUGIN, "commands", "revelation.md"), "utf8");
    expect(cmd).toMatch(/^---\nname: revelation\n/);
    expect(cmd).toContain("allowed-tools:");
  });

  it("emits the five themed subagents, each with a description (Claude-only)", () => {
    for (const name of ["oracle", "demiurge", "inquisitor", "arbiter", "seer"]) {
      const p = join(PLUGIN, "agents", `${name}.md`);
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, "utf8")).toMatch(/^---\ndescription: /);
    }
    expect(result.agents).toBe(5);
  });

  it("emits hooks.json wiring three events plus its node scripts (Claude-only)", () => {
    const hooksJson = readJson(join(PLUGIN, "hooks", "hooks.json")) as {
      hooks: Record<string, unknown>;
    };
    expect(Object.keys(hooksJson.hooks).sort()).toEqual([
      "PostToolUse",
      "PreToolUse",
      "SessionStart",
    ]);
    for (const script of ["session-start.mjs", "guard-bash.mjs", "format-edit.mjs"]) {
      expect(existsSync(join(PLUGIN, "hooks", script))).toBe(true);
    }
    expect(result.hooks).toBe(3);
  });

  it("emits Claude MCP json (typed) and a Codex TOML snippet", () => {
    const mcp = readJson(join(PLUGIN, ".mcp.json")) as {
      mcpServers: Record<string, { type: string; url?: string }>;
    };
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
