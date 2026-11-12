/**
 * Dual-engine plugin emitter.
 *
 * Reads the single source of truth in `src/plugin/_sources/` and emits a
 * committed, marketplace-installable `plugin/` directory plus the Claude
 * marketplace catalog at `.claude-plugin/marketplace.json`.
 *
 * Outputs (all generated; never hand-edit):
 *   plugin/.claude-plugin/plugin.json   Claude Code manifest
 *   plugin/.codex-plugin/plugin.json    Codex manifest (+ interface block)
 *   plugin/skills/<name>/SKILL.md        Shared workflow skills, loaded by both engines
 *   plugin/skills/<name>/agents/openai.yaml  Codex invocation policy (manual-only skills)
 *   plugin/assets/*                      Icon and logo both manifests point at
 *   plugin/commands/<name>.md           Claude-only commands (`engines: claude`; none today)
 *   plugin/agents/<name>.md             Claude subagents (Claude-only; auto-discovered)
 *   plugin/hooks/*                       Claude hooks: hooks.json + scripts (Claude-only)
 *   plugin/.mcp.json                     Claude MCP config
 *   plugin/codex-config.toml             Codex `[mcp_servers.*]` snippet
 *   plugin/codex-mcp-setup.sh            Codex `codex mcp add` setup script
 *   .claude-plugin/marketplace.json      Claude marketplace catalog
 *   site/data/godmode.json               Catalog the landing site renders
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
import { SITE } from "../src/plugin/_sources/site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SOURCES = join(ROOT, "src", "plugin", "_sources");
const PLUGIN = join(ROOT, "plugin");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
const VERSION = PKG.version;

type Engines = "both" | "claude" | "codex";
/** `auto`: the model may pick the skill from its description. `manual`: only the user starts it. */
type Invocation = "auto" | "manual";
export interface CommandSource {
  name: string;
  description: string;
  allowedTools: string | null;
  engines: Engines;
  invocation: Invocation;
  /** Group shown on the site and in the README. Never emitted into the skill. */
  pillar: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
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
      const invocation = (data.invocation as Invocation) ?? "auto";
      if (!["auto", "manual"].includes(invocation)) {
        throw new Error(`Command "${name}" has invalid invocation: "${invocation}"`);
      }
      const pillar = data.pillar ?? "";
      if (!SITE.pillars.includes(pillar)) {
        throw new Error(`Command "${name}" has invalid pillar: "${pillar}"`);
      }
      return {
        name,
        description,
        allowedTools: data["allowed-tools"] ?? null,
        engines,
        invocation,
        pillar,
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

/** Brand assets (icon, logo). Copied byte for byte; both manifests reference them. */
function readAssets(): { file: string; bytes: Buffer }[] {
  const dir = join(SOURCES, "assets");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith("_") && !f.startsWith("."))
    .sort()
    .map((file) => ({ file, bytes: readFileSync(join(dir, file)) }));
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** Safely double-quoted YAML scalar. */
export function yamlStr(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function write(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents.endsWith("\n") ? contents : contents + "\n");
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/**
 * One workflow as Markdown with frontmatter. Both engines scan `skills/`, so a shared
 * workflow is this one file; a Claude-only workflow is the same text under `commands/`.
 *
 * `name` and `description` are the Agent Skills standard. `allowed-tools` pre-approves
 * tools in Claude Code for the turn that runs the skill. `disable-model-invocation` is a
 * Claude Code extension; Codex reads the same policy from `agents/openai.yaml` instead.
 */
export function skillFromCommand(cmd: CommandSource): string {
  const lines = ["---", `name: ${cmd.name}`, `description: ${yamlStr(cmd.description)}`];
  if (cmd.allowedTools) lines.push(`allowed-tools: ${cmd.allowedTools}`);
  if (cmd.invocation === "manual") lines.push("disable-model-invocation: true");
  lines.push("---", "", cmd.body, "");
  return lines.join("\n");
}

/** First sentence of a description, for short UI labels. */
export function firstSentence(text: string): string {
  const m = text.match(/^(.*?[.!?])(\s|$)/);
  return (m?.[1] ?? text).trim();
}

/**
 * Codex per-skill metadata. Only emitted for manual-only workflows: it tells Codex not
 * to pick the skill implicitly, the counterpart of `disable-model-invocation` above.
 */
export function codexSkillPolicy(cmd: CommandSource): string {
  return [
    "# Generated from src/plugin/_sources/commands; do not hand-edit.",
    "interface:",
    `  display_name: ${yamlStr(cmd.name)}`,
    `  short_description: ${yamlStr(firstSentence(cmd.description))}`,
    "policy:",
    "  allow_implicit_invocation: false",
    "",
  ].join("\n");
}

/** Claude `.mcp.json`: wrapped `mcpServers` map with a `type` discriminator. */
export function claudeMcpJson(servers: McpServerDef[]): string {
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
export function codexMcpToml(servers: McpServerDef[]): string {
  const out: string[] = [
    "# Godmode bundled MCP servers for Codex.",
    "# Installing the plugin wires these from .mcp.json. To add them without the plugin,",
    "# append these tables to ~/.codex/config.toml.",
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

/** Quote one shell word unless it is made only of characters the shell leaves alone. */
export function shQuote(word: string): string {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(word)) return word;
  return `'${word.replace(/'/g, `'\\''`)}'`;
}

/** Codex setup script: native `codex mcp add` calls, drift-free from MCPS. */
export function codexMcpSetupScript(servers: McpServerDef[]): string {
  const out: string[] = [
    "#!/usr/bin/env bash",
    "# Godmode: register bundled MCP servers with Codex via the native CLI.",
    "# Installing the plugin already wires them; use this only without the plugin.",
    "# Generated from src/plugin/_sources/mcps.ts; do not hand-edit. Run: bash codex-mcp-setup.sh",
    "set -euo pipefail",
    "",
  ];
  for (const s of servers) {
    out.push(`# ${s.description}`);
    if (s.transport === "http") {
      out.push(`codex mcp add ${s.name} --url ${JSON.stringify(s.url)}`);
    } else {
      const words = [s.command ?? "", ...(s.args ?? [])].map(shQuote);
      out.push(`codex mcp add ${s.name} -- ${words.join(" ")}`);
    }
    out.push("");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

export function claudeManifest(): Record<string, unknown> {
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
    // Listing icon. Claude Code itself does not read it; plugin directories do.
    icon: MANIFEST.interface.logo,
    // The plugin talks to remote MCP servers, so plugin directories ask for a privacy statement.
    privacyPolicyUrl: MANIFEST.interface.privacyPolicyURL,
  };
}

export function codexManifest(): Record<string, unknown> {
  // Codex's plugin format takes the same `mcpServers` pointer, so a plugin install wires the
  // bundled servers. codex-config.toml and codex-mcp-setup.sh stay as manual fallbacks.
  return { ...claudeManifest(), skills: "./skills/", interface: MANIFEST.interface };
}

export function marketplaceCatalog(): Record<string, unknown> {
  // Only fields Claude Code reads: `claude plugin validate --strict` warns on anything else.
  return {
    name: MANIFEST.name,
    owner: MANIFEST.author,
    description: MANIFEST.description,
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
// Site catalog
// ---------------------------------------------------------------------------

/** How a server is reached: its URL, or the command line that starts it. */
export function mcpEndpoint(s: McpServerDef): string {
  return s.transport === "http" ? (s.url ?? "") : [s.command, ...(s.args ?? [])].join(" ");
}

/** Titles of the numbered `### N. Title` steps in a workflow body. */
export function procedureSteps(body: string): string[] {
  return [...body.matchAll(/^### \d+\. (.+)$/gm)].map((m) => (m[1] ?? "").trim());
}

/**
 * The catalog the landing site renders. It is built from the same definitions as the
 * plugin, so the page cannot list a workflow, subagent or server that does not ship.
 */
export function siteData(
  commands: CommandSource[],
  agents: { name: string; raw: string }[],
): Record<string, unknown> {
  return {
    generated: "Built by scripts/build-plugin.ts from src/plugin/_sources. Do not hand-edit.",
    version: VERSION,
    tagline: SITE.tagline,
    pitch: SITE.pitch,
    pillars: SITE.pillars,
    commands: commands.map((c) => ({
      name: c.name,
      pillar: c.pillar,
      purpose: firstSentence(c.description),
      description: c.description,
      invocation: c.invocation,
      allowedTools: (c.allowedTools ?? "").split(/,\s*/).filter(Boolean),
      steps: procedureSteps(c.body),
      source: `src/plugin/_sources/commands/${c.name}.md`,
      body: c.body,
    })),
    agents: agents.map((a) => {
      const { data } = parseFrontmatter(a.raw);
      return {
        name: a.name,
        role: firstSentence(data.description ?? ""),
        tools: (data.tools ?? "").split(/,\s*/).filter(Boolean),
      };
    }),
    hooks: SITE.hooks,
    connectors: MCPS.map((m) => ({
      slug: m.name,
      title: m.title,
      category: m.category,
      blurb: m.description,
      transport: m.transport,
      endpoint: mcpEndpoint(m),
      homepage: m.homepage,
    })),
    roadmap: SITE.roadmap,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateManifests(claude: unknown, codex: unknown): void {
  const ajv = new Ajv({ allErrors: true });
  const base = {
    name: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" },
    version: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    // Claude's real installer rejects an npm-style object here; it must be a plain URL string.
    repository: { type: "string", minLength: 1 },
    homepage: { type: "string", minLength: 1 },
    author: { type: "object" },
    keywords: { type: "array", items: { type: "string" } },
    mcpServers: { type: "string", minLength: 1 },
    icon: { type: "string", pattern: "^\\./assets/[a-z0-9.-]+$" },
    privacyPolicyUrl: { type: "string", pattern: "^https://" },
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
          "composerIcon",
          "logo",
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
          privacyPolicyURL: { type: "string", pattern: "^https://" },
          composerIcon: { type: "string", pattern: "^\\./assets/[a-z0-9.-]+$" },
          logo: { type: "string", pattern: "^\\./assets/[a-z0-9.-]+$" },
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
// Source name checks
// ---------------------------------------------------------------------------

/** Same rule the manifests use. Names become paths, TOML keys and shell words. */
const SAFE_NAME = /^[a-z0-9][a-z0-9-]*$/;

export interface SourceNames {
  /** Workflows that become `skills/<name>/` (engines both/codex) plus standalone skills. */
  skills: string[];
  /** Claude-only workflows that become `commands/<name>.md`. */
  commands: string[];
  agents: string[];
  mcps: string[];
}

/**
 * Fails on a name that is not kebab-case (a frontmatter `name: ../x` would otherwise write
 * outside `plugin/`) and on two sources that emit to the same file, which would otherwise
 * overwrite each other silently.
 */
export function validateSourceNames(names: SourceNames): void {
  for (const [kind, list] of Object.entries(names) as [keyof SourceNames, string[]][]) {
    const seen = new Set<string>();
    for (const name of list) {
      if (!SAFE_NAME.test(name)) {
        throw new Error(`Invalid ${kind} name "${name}": use lowercase letters, digits and dashes`);
      }
      if (seen.has(name)) throw new Error(`Duplicate ${kind} name "${name}"`);
      seen.add(name);
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
  assets: number;
}

export interface BuildOptions {
  /** Where the `plugin/` tree is written. Defaults to the committed `plugin/`. */
  outDir?: string;
  /** Where `marketplace.json` is written. Defaults to the committed `.claude-plugin/`. */
  marketplaceDir?: string;
  /** Where the site catalog is written. Defaults to the committed `site/data/godmode.json`. */
  siteDataPath?: string;
}

export function build(opts: BuildOptions = {}): BuildResult {
  const pluginDir = opts.outDir ?? PLUGIN;
  const marketplaceDir = opts.marketplaceDir ?? join(ROOT, ".claude-plugin");
  const siteDataPath = opts.siteDataPath ?? join(ROOT, "site", "data", "godmode.json");

  const commands = readCommands();
  const standaloneSkills = readStandaloneSkills();
  const agents = readAgents();
  const hooks = readHooks();
  const assets = readAssets();
  validateSourceNames({
    skills: [
      ...commands.filter((c) => c.engines !== "claude").map((c) => c.name),
      ...standaloneSkills.map((s) => s.name),
    ],
    commands: commands.filter((c) => c.engines === "claude").map((c) => c.name),
    agents: agents.map((a) => a.name),
    mcps: MCPS.map((m) => m.name),
  });

  // Clean previous output for a deterministic, idempotent build.
  rmSync(pluginDir, { recursive: true, force: true });
  rmSync(join(marketplaceDir, "marketplace.json"), { force: true });

  const claude = claudeManifest();
  const codex = codexManifest();
  validateManifests(claude, codex);
  // A manifest must never point at an image the plugin does not ship.
  for (const ref of [MANIFEST.interface.composerIcon, MANIFEST.interface.logo]) {
    if (!assets.some((a) => `./assets/${a.file}` === ref)) {
      throw new Error(`Manifest references ${ref}, which is not in _sources/assets/`);
    }
  }

  write(join(pluginDir, ".claude-plugin", "plugin.json"), json(claude));
  write(join(pluginDir, ".codex-plugin", "plugin.json"), json(codex));
  write(join(marketplaceDir, "marketplace.json"), json(marketplaceCatalog()));
  write(siteDataPath, json(siteData(commands, agents)));

  write(join(pluginDir, ".mcp.json"), claudeMcpJson(MCPS));
  write(join(pluginDir, "codex-config.toml"), codexMcpToml(MCPS));
  write(join(pluginDir, "codex-mcp-setup.sh"), codexMcpSetupScript(MCPS));

  // Claude Code and Codex both load every `skills/<name>/SKILL.md`, and both also pick up
  // `commands/*.md` (Codex migrates them into skills). Emitting a workflow to both folders
  // registers it twice, so a shared workflow goes to `skills/` only.
  let skillCount = standaloneSkills.length;
  for (const cmd of commands) {
    if (cmd.engines === "claude") {
      write(join(pluginDir, "commands", `${cmd.name}.md`), skillFromCommand(cmd));
    } else {
      write(join(pluginDir, "skills", cmd.name, "SKILL.md"), skillFromCommand(cmd));
      if (cmd.invocation === "manual") {
        write(join(pluginDir, "skills", cmd.name, "agents", "openai.yaml"), codexSkillPolicy(cmd));
      }
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
  for (const a of assets) {
    mkdirSync(join(pluginDir, "assets"), { recursive: true });
    writeFileSync(join(pluginDir, "assets", a.file), a.bytes);
  }

  return {
    commands: commands.length,
    skills: skillCount,
    mcps: MCPS.length,
    agents: agents.length,
    hooks: hooks.events,
    assets: assets.length,
  };
}

// Run when invoked directly (tsx scripts/build-plugin.ts), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const r = build();
  process.stdout.write(
    `godmode plugin built to ${PLUGIN}\n  ${r.commands} workflows, ${r.skills} skills, ` +
      `${r.agents} agents, ${r.hooks} hooks, ${r.mcps} MCP servers\n`,
  );
}
