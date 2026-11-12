import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { mcpEndpoint } from "../scripts/build-plugin.js";
import { MANIFEST } from "../src/plugin/_sources/manifest.js";
import { MCPS } from "../src/plugin/_sources/mcps.js";

/**
 * One list, many places. `mcps.ts` and the source folders are the truth; this file
 * fails when a manifest, the README, the docs, the site or llms.txt says something else.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]): string => readFileSync(join(ROOT, ...p), "utf8");
const sourceNames = (dir: string): string[] =>
  readdirSync(join(ROOT, "src", "plugin", "_sources", dir))
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();

const SERVER_NAMES = MCPS.map((m) => m.name).sort();
const HTTP = MCPS.filter((m) => m.transport === "http");
const STDIO = MCPS.filter((m) => m.transport === "stdio");
const COUNTS = {
  workflows: sourceNames("commands").length,
  subagents: sourceNames("agents").length,
  hooks: Object.keys((JSON.parse(read("plugin", "hooks", "hooks.json")) as { hooks: object }).hooks)
    .length,
  servers: MCPS.length,
};

/** Rows of the first Markdown table after `heading`, as arrays of trimmed cells. */
function tableAfter(markdown: string, heading: string): string[][] {
  const start = markdown.indexOf(heading);
  expect(start, `heading "${heading}" not found`).toBeGreaterThan(-1);
  const rows: string[][] = [];
  let inTable = false;
  for (const line of markdown.slice(start).split("\n").slice(1)) {
    if (line.startsWith("|")) {
      inTable = true;
      rows.push(
        line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    } else if (inTable) break;
  }
  return rows.slice(2); // drop the header and the separator
}

const code = (cell: string): string => cell.replace(/`/g, "");

describe("MCP server list", () => {
  it("has ten servers: six over HTTPS and four over stdio", () => {
    expect(COUNTS.servers).toBe(10);
    expect(HTTP).toHaveLength(6);
    expect(STDIO).toHaveLength(4);
  });

  it("is what .mcp.json wires for both engines", () => {
    const mcp = JSON.parse(read("plugin", ".mcp.json")) as {
      mcpServers: Record<string, { type: string; url?: string; command?: string; args?: string[] }>;
    };
    expect(Object.keys(mcp.mcpServers).sort()).toEqual(SERVER_NAMES);
    for (const m of MCPS) {
      const entry = mcp.mcpServers[m.name]!;
      expect(entry.type, m.name).toBe(m.transport);
      const endpoint = entry.url ?? [entry.command, ...(entry.args ?? [])].join(" ");
      expect(endpoint, m.name).toBe(mcpEndpoint(m));
    }
    for (const engine of [".claude-plugin", ".codex-plugin"]) {
      const manifest = JSON.parse(read("plugin", engine, "plugin.json")) as { mcpServers: string };
      expect(manifest.mcpServers, engine).toBe("./.mcp.json");
    }
  });

  it("is what the Codex fallbacks register", () => {
    const toml = read("plugin", "codex-config.toml");
    const tables = [...toml.matchAll(/^\[mcp_servers\.([^\]]+)\]$/gm)].map((m) => m[1]!);
    expect(tables.sort()).toEqual(SERVER_NAMES);
    const sh = read("plugin", "codex-mcp-setup.sh");
    const added = [...sh.matchAll(/^codex mcp add (\S+) /gm)].map((m) => m[1]!);
    expect(added.sort()).toEqual(SERVER_NAMES);
  });

  it("launches stdio servers through npx with a scoped or well-known package", () => {
    for (const m of STDIO) {
      expect(m.command, m.name).toBe("npx");
      expect(m.args?.[0], m.name).toBe("-y");
      expect(m.args?.[1], m.name).toMatch(/^(@[a-z0-9-]+\/)?[a-z0-9-]+@[^@]+$/);
    }
  });

  it("pins every stdio package to one exact stable version", () => {
    // A dist-tag such as @latest can move to a prerelease without notice, and a bare
    // package name means the same thing to npx. Only x.y.z is accepted.
    const pinned = /^(@[a-z0-9-]+\/)?[a-z0-9-]+@\d+\.\d+\.\d+$/;
    for (const m of STDIO) expect(m.args?.[1], m.name).toMatch(pinned);
    const config = JSON.parse(read("plugin", ".mcp.json")) as {
      mcpServers: Record<string, { type: string; args?: string[] }>;
    };
    for (const [name, def] of Object.entries(config.mcpServers)) {
      if (def.type === "stdio") expect(def.args?.[1], name).toMatch(pinned);
    }
  });

  it("names no floating dist-tag anywhere a launch command is published", () => {
    const published = [
      ["plugin", ".mcp.json"],
      ["plugin", "codex-config.toml"],
      ["plugin", "codex-mcp-setup.sh"],
      ["site", "data", "godmode.json"],
      ["site", "index.html"],
      ["README.md"],
    ];
    for (const path of published) {
      expect(read(...path), path.join("/")).not.toMatch(/@(latest|next|canary|beta|alpha)\b/);
    }
  });

  it("carries no credentials: no env, headers, tokens or keys in any definition", () => {
    const text = JSON.stringify(MCPS) + read("plugin", ".mcp.json");
    expect(text).not.toMatch(/"(env|headers|authorization|bearer_token_env_var)"/i);
    expect(text).not.toMatch(/api[_-]?key|token=|secret/i);
    for (const m of HTTP) expect(new URL(m.url!).search, m.name).toBe("");
  });

  it("is named in full in the manifest's long description", () => {
    const long = MANIFEST.interface.longDescription;
    for (const m of MCPS) expect(long, m.title).toContain(m.title);
    for (const name of sourceNames("commands")) expect(long, name).toContain(name);
    for (const name of sourceNames("agents")) expect(long, name).toContain(name);
  });

  it("matches the README table: same names, same transports", () => {
    const rows = tableAfter(read("README.md"), "## MCP servers");
    expect(rows.map((r) => code(r[0]!)).sort()).toEqual(SERVER_NAMES);
    for (const row of rows) {
      const def = MCPS.find((m) => m.name === code(row[0]!))!;
      expect(row[1], def.name).toMatch(def.transport === "http" ? /HTTPS/ : /npx/);
      expect(row[2], def.name).toBe(def.category);
    }
  });

  it("matches docs/mcp-servers.md: names, transports, endpoints and upstream links", () => {
    const rows = tableAfter(read("docs", "mcp-servers.md"), "## Servers");
    expect(rows.map((r) => code(r[0]!)).sort()).toEqual(SERVER_NAMES);
    for (const row of rows) {
      const def = MCPS.find((m) => m.name === code(row[0]!))!;
      expect(row[1], def.name).toBe(def.transport);
      expect(code(row[2]!), def.name).toBe(mcpEndpoint(def));
      expect(row[3], def.name).toContain(`(${def.homepage})`);
    }
  });

  it("matches the site: catalog data and the no-JavaScript fallback", () => {
    const data = JSON.parse(read("site", "data", "godmode.json")) as {
      connectors: { slug: string; transport: string; endpoint: string; homepage: string }[];
    };
    expect(data.connectors.map((c) => c.slug).sort()).toEqual(SERVER_NAMES);
    for (const c of data.connectors) {
      const def = MCPS.find((m) => m.name === c.slug)!;
      expect(c.endpoint, c.slug).toBe(mcpEndpoint(def));
      expect(c.homepage, c.slug).toBe(def.homepage);
    }
    const html = read("site", "index.html");
    const start = html.indexOf('id="connectors-root"');
    const fallback = html.slice(start, html.indexOf("</section>", start));
    for (const m of MCPS) expect(fallback, m.title).toContain(m.title);
  });
});

describe("count claims", () => {
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  WORDS.push("ten", "eleven", "twelve");
  const NUMBER = `(${WORDS.slice(2).join("|")}|\\d+)`;
  const NOUNS: [RegExp, keyof typeof COUNTS][] = [
    [/^(workflow skills|workflows|coding workflows|skills|commands)$/i, "workflows"],
    [/^subagents$/i, "subagents"],
    [/^hooks$/i, "hooks"],
    [/^(MCP servers|servers)$/i, "servers"],
  ];
  // Same line only, and a digit must start a word: "4.0.0-beta.7" is not a count.
  const CLAIM = new RegExp(
    `(?<![\\w.-])${NUMBER}[ \\t]+((?:[\\w-]+[ \\t]+){0,3}?)(workflow skills|coding workflows|workflows|skills|commands|subagents|hooks|MCP servers|servers)\\b`,
    "gi",
  );

  /** Every "<number> ... <noun>" in `text`, with the count the sources say it should be. */
  function claims(text: string): { phrase: string; said: number; expected: number }[] {
    const out = [];
    const prose = text.replace(/```[\s\S]*?```/g, "");
    for (const m of prose.matchAll(CLAIM)) {
      const raw = m[1]!.toLowerCase();
      const said = /^\d+$/.test(raw) ? Number(raw) : WORDS.indexOf(raw);
      const qualifier = m[2]!.toLowerCase();
      const kind = NOUNS.find(([re]) => re.test(m[3]!))![1];
      let expected = COUNTS[kind];
      if (kind === "servers" && /stdio|npx|local/.test(qualifier)) expected = STDIO.length;
      if (kind === "servers" && /remote|https?/.test(qualifier)) expected = HTTP.length;
      out.push({ phrase: m[0], said, expected });
    }
    return out;
  }

  it("recognizes the phrasings the docs use", () => {
    expect(claims("nine workflow skills and ten no-auth MCP servers")).toEqual([
      { phrase: "nine workflow skills", said: 9, expected: COUNTS.workflows },
      { phrase: "ten no-auth MCP servers", said: 10, expected: COUNTS.servers },
    ]);
    expect(claims("The four stdio servers and 5 subagents")).toEqual([
      { phrase: "four stdio servers", said: 4, expected: STDIO.length },
      { phrase: "5 subagents", said: 5, expected: COUNTS.subagents },
    ]);
  });

  const files = [
    "README.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "llms.txt",
    "package.json",
    "docs/architecture.md",
    "docs/mcp-servers.md",
    "site/index.html",
    "site/data/godmode.json",
    "src/plugin/_sources/manifest.ts",
    "src/plugin/_sources/site.ts",
  ];

  it.each(files)("%s states the counts the sources produce", (file) => {
    if (!existsSync(join(ROOT, file))) return;
    const found = claims(read(file));
    for (const c of found) expect(c.said, `${file}: "${c.phrase}"`).toBe(c.expected);
  });

  it("finds claims in the files a visitor reads first", () => {
    for (const file of ["README.md", "llms.txt", "site/index.html"]) {
      expect(claims(read(file)).length, file).toBeGreaterThanOrEqual(2);
    }
  });
});
