import { describe, it, expect } from "vitest";
import {
  claudeMcpJson,
  codexMcpSetupScript,
  codexMcpToml,
  parseFrontmatter,
  validateManifests,
  yamlStr,
} from "../../scripts/build-plugin.js";
import type { McpServerDef } from "../../src/plugin/_sources/mcps.js";

const HTTP: McpServerDef = {
  name: "docs",
  title: "Docs",
  category: "Docs",
  transport: "http",
  url: "https://example.com/mcp",
  description: "Example docs server.",
};
const STDIO: McpServerDef = {
  name: "browser",
  title: "Browser",
  category: "Browser",
  transport: "stdio",
  command: "npx",
  args: ["-y", "example-mcp@1.0.0"],
  description: "Example stdio server.",
};

describe("parseFrontmatter", () => {
  it("splits frontmatter from body and strips matching quotes", () => {
    const { data, body } = parseFrontmatter(
      '---\nname: revelation\ndescription: "Explore a codebase."\nengines: \'both\'\n---\n\nBody text.\n',
    );
    expect(data).toEqual({
      name: "revelation",
      description: "Explore a codebase.",
      engines: "both",
    });
    expect(body.trim()).toBe("Body text.");
  });

  it("keeps everything after the first colon as the value", () => {
    const { data } = parseFrontmatter("---\ndescription: Step 1: read. Step 2: write.\n---\nx");
    expect(data.description).toBe("Step 1: read. Step 2: write.");
  });

  it("accepts CRLF line endings", () => {
    const { data, body } = parseFrontmatter("---\r\nname: gospel\r\n---\r\nBody");
    expect(data.name).toBe("gospel");
    expect(body).toBe("Body");
  });

  it("returns the whole input as body when there is no frontmatter", () => {
    const raw = "# Just markdown\n\nNo frontmatter here.";
    expect(parseFrontmatter(raw)).toEqual({ data: {}, body: raw });
  });

  it("ignores lines without a key", () => {
    const { data } = parseFrontmatter("---\nname: a\njust text\n: no key\n---\n");
    expect(data).toEqual({ name: "a" });
  });
});

describe("yamlStr", () => {
  it("double-quotes and escapes backslashes and quotes", () => {
    expect(yamlStr("plain")).toBe('"plain"');
    expect(yamlStr('say "hi"')).toBe('"say \\"hi\\""');
    expect(yamlStr("C:\\path")).toBe('"C:\\\\path"');
  });
});

describe("MCP emitters", () => {
  const servers = [HTTP, STDIO];

  it("emits a typed Claude .mcp.json for both transports", () => {
    expect(JSON.parse(claudeMcpJson(servers))).toEqual({
      mcpServers: {
        docs: { type: "http", url: "https://example.com/mcp" },
        browser: { type: "stdio", command: "npx", args: ["-y", "example-mcp@1.0.0"] },
      },
    });
  });

  it("defaults stdio args to an empty array", () => {
    const noArgs: McpServerDef = { ...STDIO, args: undefined };
    const parsed = JSON.parse(claudeMcpJson([noArgs])) as {
      mcpServers: Record<string, { args: string[] }>;
    };
    expect(parsed.mcpServers.browser?.args).toEqual([]);
  });

  it("emits one Codex TOML table per server with the right keys", () => {
    const toml = codexMcpToml(servers);
    expect(toml).toContain('[mcp_servers.docs]\nurl = "https://example.com/mcp"');
    expect(toml).toContain(
      '[mcp_servers.browser]\ncommand = "npx"\nargs = ["-y","example-mcp@1.0.0"]',
    );
    expect(toml.match(/^\[mcp_servers\./gm)).toHaveLength(2);
  });

  it("emits a fail-fast setup script with one `codex mcp add` per server", () => {
    const sh = codexMcpSetupScript(servers);
    expect(sh.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(sh).toContain("set -euo pipefail");
    expect(sh).toContain('codex mcp add docs --url "https://example.com/mcp"');
    expect(sh).toContain("codex mcp add browser -- npx -y example-mcp@1.0.0");
    expect(sh.match(/^codex mcp add /gm)).toHaveLength(2);
  });
});

describe("validateManifests", () => {
  const iface = {
    displayName: "Godmode",
    shortDescription: "s",
    longDescription: "l",
    developerName: "d",
    category: "Developer Tools",
    capabilities: ["Read"],
    defaultPrompt: ["/revelation"],
    brandColor: "#7C3AED",
    websiteURL: "https://example.com",
  };
  const claude = {
    name: "godmode",
    version: "1.0.0",
    description: "d",
    repository: "https://github.com/example/godmode",
    mcpServers: "./.mcp.json",
  };
  const codex = { ...claude, skills: "./skills/", interface: iface };

  it("accepts well-formed manifests", () => {
    expect(() => validateManifests(claude, codex)).not.toThrow();
  });

  it("rejects a name that is not lowercase kebab-case", () => {
    expect(() => validateManifests({ ...claude, name: "GodMode" }, codex)).toThrow(/claude/);
  });

  it("rejects an npm-style repository object", () => {
    const repo = { type: "git", url: "https://github.com/example/godmode" };
    expect(() => validateManifests({ ...claude, repository: repo }, codex)).toThrow(/repository/);
  });

  it("rejects a Claude manifest without the MCP pointer", () => {
    const noMcp: Record<string, unknown> = { ...claude };
    delete noMcp.mcpServers;
    expect(() => validateManifests(noMcp, codex)).toThrow(/mcpServers/);
  });

  it("rejects a Codex interface with a bad brand color or a missing field", () => {
    const badColor = { ...codex, interface: { ...iface, brandColor: "purple" } };
    expect(() => validateManifests(claude, badColor)).toThrow(/codex/);
    const partial: Record<string, unknown> = { ...iface };
    delete partial.websiteURL;
    expect(() => validateManifests(claude, { ...codex, interface: partial })).toThrow(
      /websiteURL/,
    );
  });
});
