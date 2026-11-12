import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build, parseFrontmatter } from "../../scripts/build-plugin.js";
import { MCPS } from "../../src/plugin/_sources/mcps.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMMITTED_PLUGIN = join(ROOT, "plugin");
const COMMITTED_MARKETPLACE = join(ROOT, ".claude-plugin", "marketplace.json");

/** Every file under `dir`, as sorted paths relative to it. */
function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p));
    }
  };
  walk(dir);
  return out.sort();
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("plugin packaging", () => {
  let TMP: string;
  let PLUGIN: string;
  let MARKETPLACE_DIR: string;

  beforeAll(() => {
    TMP = mkdtempSync(join(tmpdir(), "gm-pack-"));
    PLUGIN = join(TMP, "plugin");
    MARKETPLACE_DIR = join(TMP, ".claude-plugin");
    build({ outDir: PLUGIN, marketplaceDir: MARKETPLACE_DIR });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("matches the committed plugin/ tree exactly (run `pnpm build:plugin` if this fails)", () => {
    const fresh = listFiles(PLUGIN);
    expect(listFiles(COMMITTED_PLUGIN)).toEqual(fresh);
    for (const file of fresh) {
      // Compared as bytes so the icon and logo are covered too.
      const same = readFileSync(join(COMMITTED_PLUGIN, file)).equals(
        readFileSync(join(PLUGIN, file)),
      );
      expect(same, `${file} differs from a fresh build`).toBe(true);
    }
    expect(readFileSync(COMMITTED_MARKETPLACE, "utf8")).toBe(
      readFileSync(join(MARKETPLACE_DIR, "marketplace.json"), "utf8"),
    );
  });

  it("is deterministic and removes stale output on rebuild", () => {
    const before = listFiles(PLUGIN).map((f) => [f, readFileSync(join(PLUGIN, f), "utf8")]);
    build({ outDir: PLUGIN, marketplaceDir: MARKETPLACE_DIR });
    const after = listFiles(PLUGIN).map((f) => [f, readFileSync(join(PLUGIN, f), "utf8")]);
    expect(after).toEqual(before);
  });

  it("gives every skill a name matching its folder and a non-empty description", () => {
    const skillsDir = join(PLUGIN, "skills");
    const names = readdirSync(skillsDir);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const { data, body } = parseFrontmatter(
        readFileSync(join(skillsDir, name, "SKILL.md"), "utf8"),
      );
      expect(data.name, name).toBe(name);
      expect(data.description?.trim().length, name).toBeGreaterThan(0);
      expect(body.trim().length, name).toBeGreaterThan(0);
    }
  });

  it("registers each workflow once: no name in both commands/ and skills/", () => {
    const skills = new Set(readdirSync(join(PLUGIN, "skills")));
    const commandsDir = join(PLUGIN, "commands");
    const commands = existsSync(commandsDir)
      ? readdirSync(commandsDir).map((f) => f.replace(/\.md$/, ""))
      : [];
    expect(commands.filter((c) => skills.has(c))).toEqual([]);
  });

  it("only points hooks at scripts that ship inside the plugin", () => {
    const hooks = readJson<{
      hooks: Record<string, { hooks: { type: string; command: string }[] }[]>;
    }>(join(PLUGIN, "hooks", "hooks.json"));
    const commands = Object.values(hooks.hooks)
      .flat()
      .flatMap((m) => m.hooks)
      .map((h) => h.command);
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      const m = command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/);
      expect(m, command).not.toBeNull();
      expect(existsSync(join(PLUGIN, m![1]!)), command).toBe(true);
    }
  });

  it("keeps the version in sync across both manifests and the marketplace entry", () => {
    const pkg = readJson<{ version: string }>(join(ROOT, "package.json"));
    const claude = readJson<{ version: string }>(join(PLUGIN, ".claude-plugin", "plugin.json"));
    const codex = readJson<{ version: string }>(join(PLUGIN, ".codex-plugin", "plugin.json"));
    const market = readJson<{ plugins: { name: string; version: string; source: string }[] }>(
      join(MARKETPLACE_DIR, "marketplace.json"),
    );
    expect(claude.version).toBe(pkg.version);
    expect(codex.version).toBe(pkg.version);
    expect(market.plugins).toHaveLength(1);
    expect(market.plugins[0]).toMatchObject({
      name: "godmode",
      version: pkg.version,
      source: "./plugin",
    });
  });

  it("points both manifests at paths that exist in the plugin", () => {
    for (const engine of [".claude-plugin", ".codex-plugin"]) {
      const manifest = readJson<Record<string, unknown>>(join(PLUGIN, engine, "plugin.json"));
      const iface = (manifest.interface ?? {}) as Record<string, unknown>;
      const paths = {
        mcpServers: manifest.mcpServers,
        skills: manifest.skills,
        icon: manifest.icon,
        composerIcon: iface.composerIcon,
        logo: iface.logo,
      };
      for (const [key, value] of Object.entries(paths)) {
        if (typeof value !== "string") continue;
        expect(value.startsWith("./"), `${engine} ${key}`).toBe(true);
        expect(existsSync(join(PLUGIN, value)), `${engine} ${key}`).toBe(true);
      }
    }
  });

  it("ships square PNG icons at the sizes the manifests reference", () => {
    // PNG stores width and height as big-endian 32-bit integers at bytes 16 and 20.
    const size = (file: string): [number, number] => {
      const png = readFileSync(join(PLUGIN, "assets", file));
      expect(png.subarray(1, 4).toString("latin1"), file).toBe("PNG");
      return [png.readUInt32BE(16), png.readUInt32BE(20)];
    };
    expect(size("icon.png")).toEqual([128, 128]);
    expect(size("logo.png")).toEqual([512, 512]);
    expect(readFileSync(join(PLUGIN, "assets", "icon.svg"), "utf8")).toContain('viewBox="0 0 64 64"');
  });

  it("uses the same icon for the plugin and the site favicon", () => {
    expect(readFileSync(join(ROOT, "site", "assets", "favicon.svg"), "utf8")).toBe(
      readFileSync(join(PLUGIN, "assets", "icon.svg"), "utf8"),
    );
  });
});

describe("bundled MCP server definitions", () => {
  it("use unique kebab-case names", () => {
    const names = MCPS.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it("are complete for their transport, and remote ones use HTTPS", () => {
    for (const m of MCPS) {
      expect(m.title.trim().length, m.name).toBeGreaterThan(0);
      expect(m.description.trim().length, m.name).toBeGreaterThan(0);
      if (m.transport === "http") {
        expect(m.url, m.name).toMatch(/^https:\/\//);
        expect(m.command, m.name).toBeUndefined();
      } else {
        expect(m.command, m.name).toBeTruthy();
        expect(m.url, m.name).toBeUndefined();
      }
    }
  });
});
