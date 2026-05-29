/**
 * Dual-engine plugin emitter.
 *
 * Reads the single source of truth in `src/plugin/_sources/` and emits a
 * committed, marketplace-installable `plugin/` directory plus the Claude
 * marketplace catalog at `.claude-plugin/marketplace.json`.
 *
 * Outputs (all generated — never hand-edit):
 *   plugin/.claude-plugin/plugin.json   Claude Code manifest
 *   plugin/.codex-plugin/plugin.json    Codex manifest (+ interface block)
 *   plugin/commands/<name>.md           Claude slash commands
 *   plugin/skills/<name>/SKILL.md        Shared skills (Codex's command equivalent)
 *   plugin/agents/<name>.md             Claude subagents (Claude-only; auto-discovered)
 *   plugin/hooks/*                       Claude hooks: hooks.json + scripts (Claude-only)
 *   plugin/.mcp.json                     Claude MCP config
 *   plugin/codex-config.toml             Codex `[mcp_servers.*]` snippet
 *   plugin/codex-mcp-setup.sh            Codex `codex mcp add` setup script
 *   .claude-plugin/marketplace.json      Claude marketplace catalog
 *
 * Run: `pnpm build:plugin` (tsx). Validates both manifests with ajv and exits
 * non-zero on any schema violation.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import { MANIFEST } from "../src/plugin/_sources/manifest.js";
import { MCPS, type McpServerDef } from "../src/plugin/_sources/mcps.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SOURCES = join(ROOT, "src", "plugin", "_sources");
const PLUGIN = join(ROOT, "plugin");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
const VERSION = PKG.version;

type Engines = "both" | "claude" | "codex";
interface CommandSource {
  name: string;
  description: string;
  allowedTools: string | null;
  engines: Engines;
  body: string;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of (m[1] ?? "").split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) data[key] = val;
  }
  return { data, body: m[2] ?? "" };
}

function readCommands(): CommandSource[] {
  const dir = join(SOURCES, "commands");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((file) => {
      const { data, body } = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
      const name = data.name ?? file.replace(/\.md$/, "");
      const description = data.description ?? "";
      const engines = (data.engines as Engines) ?? "both";
      if (!description) throw new Error(`Command "${name}" is missing a description`);
      if (!["both", "claude", "codex"].includes(engines)) {
        throw new Error(`Command "${name}" has invalid engines: "${engines}"`);
      }
      return {
        name,
        description,
        allowedTools: data["allowed-tools"] ?? null,
        engines,
        body: body.trim(),
      };
    });
}

/** Standalone skills authored directly as skills (not derived from a command). */
function readStandaloneSkills(): { name: string; raw: string }[] {
  const dir = join(SOURCES, "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(join(dir, name, "SKILL.md")))
    .sort()
    .map((name) => ({ name, raw: readFileSync(join(dir, name, "SKILL.md"), "utf8") }));
}

/**
 * Plugin subagents (Claude-only). Emitted verbatim from `_sources/agents/*.md`.
 * Claude rejects an agent that lacks a `description`, so fail the build here rather
 * than ship one that breaks `plugin install`.
 */
function readAgents(): { name: string; raw: string }[] {
  const dir = join(SOURCES, "agents");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((file) => {
      const raw = readFileSync(join(dir, file), "utf8");
      const { data } = parseFrontmatter(raw);
      const name = file.replace(/\.md$/, "");
      if (!data.description) {
        throw new Error(
          `Agent "${name}" is missing a description (Claude rejects agents without one)`,
        );
      }
      return { name, raw };
    });
}

/**
 * Plugin hooks (Claude-only). Copied verbatim from `_sources/hooks/`. `hooks.json` must
 * be valid JSON or the build fails; `events` counts the wired event types for the log.
 */
function readHooks(): { files: { file: string; raw: string }[]; events: number } {
  const dir = join(SOURCES, "hooks");
  if (!existsSync(dir)) return { files: [], events: 0 };
  const names = readdirSync(dir)
    .filter((f) => !f.startsWith("_"))
    .sort();
  let events = 0;
  if (names.includes("hooks.json")) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, "hooks.json"), "utf8")) as {
        hooks?: Record<string, unknown>;
      };
      events = Object.keys(parsed.hooks ?? {}).length;
    } catch (e) {
      throw new Error(`hooks/hooks.json is not valid JSON: ${(e as Error).message}`);
    }
  }
  return {
    files: names.map((file) => ({ file, raw: readFileSync(join(dir, file), "utf8") })),
    events,
  };
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** Safely double-quoted YAML scalar. */
function yamlStr(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents.endsWith("\n") ? contents : contents + "\n");
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function claudeCommand(cmd: CommandSource): string {
  const lines = ["---", `name: ${cmd.name}`, `description: ${yamlStr(cmd.description)}`];
  if (cmd.allowedTools) lines.push(`allowed-tools: ${cmd.allowedTools}`);
  lines.push("---", "", cmd.body, "");
  return lines.join("\n");
}

function skillFromCommand(cmd: CommandSource): string {
  return [
    "---",
    `name: ${cmd.name}`,
    `description: ${yamlStr(cmd.description)}`,
    "---",
    "",
    cmd.body,
    "",
  ].join("\n");
}

/** Claude `.mcp.json`: wrapped `mcpServers` map with a `type` discriminator. */
function claudeMcpJson(servers: McpServerDef[]): string {
  const map: Record<string, unknown> = {};
  for (const s of servers) {
    map[s.name] =
      s.transport === "http"
        ? { type: "http", url: s.url }
        : { type: "stdio", command: s.command, args: s.args ?? [] };
  }
  return json({ mcpServers: map });
}

/** Codex `config.toml`: one `[mcp_servers.<name>]` table per server. */
function codexMcpToml(servers: McpServerDef[]): string {
  const out: string[] = [
    "# Godmode bundled MCP servers for Codex.",
    "# Append these tables to ~/.codex/config.toml (or run the documented install step).",
    "",
  ];
  for (const s of servers) {
    out.push(`# ${s.description}`);
    out.push(`[mcp_servers.${s.name}]`);
    if (s.transport === "http") {
      out.push(`url = ${JSON.stringify(s.url)}`);
    } else {
      out.push(`command = ${JSON.stringify(s.command)}`);
      out.push(`args = ${JSON.stringify(s.args ?? [])}`);
    }
    out.push("");
  }
  return out.join("\n");
}

/** Codex setup script: native `codex mcp add` calls, drift-free from MCPS. */
function codexMcpSetupScript(servers: McpServerDef[]): string {
  const out: string[] = [
    "#!/usr/bin/env bash",
    "# Godmode — register bundled MCP servers with Codex via the native CLI.",
    "# Generated from src/plugin/_sources/mcps.ts — do not hand-edit. Run: bash codex-mcp-setup.sh",
    "set -euo pipefail",
    "",
  ];
  for (const s of servers) {
    out.push(`# ${s.description}`);
    if (s.transport === "http") {
      out.push(`codex mcp add ${s.name} --url ${JSON.stringify(s.url)}`);
    } else {
      out.push(`codex mcp add ${s.name} -- ${[s.command, ...(s.args ?? [])].join(" ")}`);
    }
    out.push("");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

function claudeManifest(): Record<string, unknown> {
  return {
    name: MANIFEST.name,
    version: VERSION,
    description: MANIFEST.description,
    author: MANIFEST.author,
    homepage: MANIFEST.homepage,
    repository: MANIFEST.repository,
    license: MANIFEST.license,
    keywords: MANIFEST.keywords,
    // Points Claude Code at the bundled MCP config so the documentation servers load on install.
    mcpServers: "./.mcp.json",
  };
}

function codexManifest(): Record<string, unknown> {
  // Codex registers MCP servers via `codex mcp add` (see codex-mcp-setup.sh),
  // not via a Claude-style `mcpServers` pointer, so omit it here.
  const base = claudeManifest();
  delete base.mcpServers;
  return { ...base, skills: "./skills/", interface: MANIFEST.interface };
}

function marketplaceCatalog(): Record<string, unknown> {
  return {
    name: MANIFEST.name,
    owner: { name: MANIFEST.author.name },
    metadata: { description: MANIFEST.description, homepage: MANIFEST.homepage },
    plugins: [
      {
        name: MANIFEST.name,
        version: VERSION,
        source: "./plugin",
        description: MANIFEST.description,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateManifests(claude: unknown, codex: unknown): void {
  const ajv = new Ajv({ allErrors: true });
  const base = {
    name: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
    version: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    // Claude's real installer rejects an npm-style object here — it must be a plain URL string.
    repository: { type: "string", minLength: 1 },
    homepage: { type: "string", minLength: 1 },
    author: { type: "object" },
    keywords: { type: "array", items: { type: "string" } },
    mcpServers: { type: "string", minLength: 1 },
  } as const;

  const claudeSchema = {
    type: "object",
    required: ["name", "version", "description", "repository", "mcpServers"],
    properties: base,
  };
  const codexSchema = {
    type: "object",
    required: ["name", "version", "description", "skills", "interface"],
    properties: {
      ...base,
      skills: { type: "string" },
      interface: {
        type: "object",
        required: [
          "displayName",
          "shortDescription",
          "longDescription",
          "developerName",
          "category",
          "capabilities",
          "defaultPrompt",
          "brandColor",
          "websiteURL",
        ],
        properties: {
          displayName: { type: "string", minLength: 1 },
          shortDescription: { type: "string", minLength: 1 },
          longDescription: { type: "string", minLength: 1 },
          developerName: { type: "string", minLength: 1 },
          category: { type: "string", minLength: 1 },
          capabilities: { type: "array", items: { type: "string" } },
          defaultPrompt: { type: "array", items: { type: "string" } },
          brandColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
          websiteURL: { type: "string", minLength: 1 },
        },
      },
    },
  };

  for (const [label, schema, data] of [
    ["claude", claudeSchema, claude],
    ["codex", codexSchema, codex],
  ] as const) {
    const validate = ajv.compile(schema);
    if (!validate(data)) {
      throw new Error(
        `${label} manifest failed schema validation: ${ajv.errorsText(validate.errors)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export interface BuildResult {
  commands: number;
  skills: number;
  mcps: number;
  agents: number;
  hooks: number;
}

export interface BuildOptions {
  /** Where the `plugin/` tree is written. Defaults to the committed `plugin/`. */
  outDir?: string;
  /** Where `marketplace.json` is written. Defaults to the committed `.claude-plugin/`. */
  marketplaceDir?: string;
}

export function build(opts: BuildOptions = {}): BuildResult {
  const pluginDir = opts.outDir ?? PLUGIN;
  const marketplaceDir = opts.marketplaceDir ?? join(ROOT, ".claude-plugin");

  const commands = readCommands();
  const standaloneSkills = readStandaloneSkills();
  const agents = readAgents();
  const hooks = readHooks();

  // Clean previous output for a deterministic, idempotent build.
  rmSync(pluginDir, { recursive: true, force: true });
  rmSync(join(marketplaceDir, "marketplace.json"), { force: true });

  const claude = claudeManifest();
  const codex = codexManifest();
  validateManifests(claude, codex);

  write(join(pluginDir, ".claude-plugin", "plugin.json"), json(claude));
  write(join(pluginDir, ".codex-plugin", "plugin.json"), json(codex));
  write(join(marketplaceDir, "marketplace.json"), json(marketplaceCatalog()));

  write(join(pluginDir, ".mcp.json"), claudeMcpJson(MCPS));
  write(join(pluginDir, "codex-config.toml"), codexMcpToml(MCPS));
  write(join(pluginDir, "codex-mcp-setup.sh"), codexMcpSetupScript(MCPS));

  let skillCount = standaloneSkills.length;
  for (const cmd of commands) {
    if (cmd.engines === "both" || cmd.engines === "claude") {
      write(join(pluginDir, "commands", `${cmd.name}.md`), claudeCommand(cmd));
    }
    if (cmd.engines === "both" || cmd.engines === "codex") {
      write(join(pluginDir, "skills", cmd.name, "SKILL.md"), skillFromCommand(cmd));
      skillCount++;
    }
  }
  for (const skill of standaloneSkills) {
    write(join(pluginDir, "skills", skill.name, "SKILL.md"), skill.raw);
  }

  // Subagents and hooks are Claude-only. Codex has no equivalent surface.
  for (const agent of agents) {
    write(join(pluginDir, "agents", `${agent.name}.md`), agent.raw);
  }
  for (const h of hooks.files) {
    write(join(pluginDir, "hooks", h.file), h.raw);
  }

  return {
    commands: commands.length,
    skills: skillCount,
    mcps: MCPS.length,
    agents: agents.length,
    hooks: hooks.events,
  };
}

// Run when invoked directly (tsx scripts/build-plugin.ts), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const r = build();
  process.stdout.write(
    `godmode plugin built to ${PLUGIN}\n  ${r.commands} commands, ${r.skills} skills, ` +
      `${r.agents} agents, ${r.hooks} hooks, ${r.mcps} MCP servers\n`,
  );
}
