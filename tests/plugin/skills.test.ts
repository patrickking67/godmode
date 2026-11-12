import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../../scripts/build-plugin.js";
import { MCPS } from "../../src/plugin/_sources/mcps.js";

/**
 * Lint for the workflow skills. It reads the generated `plugin/skills/` tree, the files
 * users install, so a rule here is a rule about what ships.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILLS_DIR = join(ROOT, "plugin", "skills");
const SOURCES = join(ROOT, "src", "plugin", "_sources");

const names = (dir: string): string[] =>
  readdirSync(join(SOURCES, dir))
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();

const SKILL_NAMES = readdirSync(SKILLS_DIR).sort();
const AGENT_NAMES = names("agents");

/** Sections every workflow must have, in this order. */
const REQUIRED_SECTIONS = ["When to use", "Procedure", "Stop conditions", "Verify"];

/** Tools that only read. Anything else in `allowed-tools` must be a scoped git command. */
const READ_ONLY_TOOLS = new Set(["Read", "Grep", "Glob"]);
const SCOPED_GIT = /^Bash\(git (status|diff|show|log|branch|add|commit) \*\)$/;
/** Git subcommands that change the repository. Only a manual-only skill may pre-approve them. */
const WRITING_GIT = /^Bash\(git (add|commit) \*\)$/;

function load(name: string): { data: Record<string, string>; body: string } {
  return parseFrontmatter(readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8"));
}

/** Top-level sections of a body, ignoring headings inside fenced code blocks. */
function sections(body: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    else if (!fenced && line.startsWith("## ")) out.push(line.slice(3).trim());
  }
  return out;
}

/** Body text with fenced code blocks removed, for prose-only rules. */
function prose(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "");
}

describe("skill lint", () => {
  it("covers exactly the workflows in the source folder", () => {
    expect(SKILL_NAMES).toEqual(names("commands"));
    expect(SKILL_NAMES).toHaveLength(9);
  });

  describe.each(SKILL_NAMES)("%s", (name) => {
    const { data, body } = load(name);
    const description = data.description ?? "";

    it("has only known frontmatter fields and a name that matches its folder", () => {
      expect(data.name).toBe(name);
      const known = ["name", "description", "allowed-tools", "disable-model-invocation"];
      expect(Object.keys(data).filter((k) => !known.includes(k))).toEqual([]);
    });

    it("has a description that says what it does and when to use it", () => {
      // Both engines shorten long listings, so the action comes first and stays short.
      expect(description.length).toBeGreaterThanOrEqual(80);
      expect(description.length).toBeLessThanOrEqual(320);
      expect(description).toMatch(/^[A-Z][a-z]+ /);
      expect(description.indexOf(" Use ")).toBeGreaterThan(0);
      expect(description).toMatch(/\bUse (only )?when\b/);
      expect(description.endsWith(".")).toBe(true);
      // The first sentence is the Codex short description; it must stand alone.
      expect(description.split(". ")[0]!.length).toBeLessThanOrEqual(200);
    });

    it("has the required sections in order, and numbered procedure steps", () => {
      const found = sections(body).filter((s) => REQUIRED_SECTIONS.includes(s));
      expect(found).toEqual(REQUIRED_SECTIONS);
      const steps = [...body.matchAll(/^### (\d+)\. \S/gm)].map((m) => Number(m[1]));
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps).toEqual(steps.map((_, i) => i + 1));
    });

    it("gives each required section real content", () => {
      for (const title of REQUIRED_SECTIONS) {
        const start = body.indexOf(`## ${title}\n`);
        const rest = body.slice(start + title.length + 4);
        const end = rest.search(/^## /m);
        const text = (end === -1 ? rest : rest.slice(0, end)).trim();
        expect(text.length, title).toBeGreaterThan(80);
      }
    });

    it("stays engine-neutral", () => {
      const text = prose(body);
      // Codex does not substitute $ARGUMENTS; Claude Code appends the arguments on its own.
      expect(body).not.toContain("$ARGUMENTS");
      // A bare /name does not resolve in Claude Code (plugin skills are /godmode:<name>).
      for (const other of SKILL_NAMES) expect(text).not.toMatch(new RegExp(`(^|\\s)/${other}\\b`));
      // Tool names that exist in one engine only, or that no longer exist.
      for (const tool of ["TodoWrite", "MultiEdit", "the `Task` tool", "`Explore` agent"]) {
        expect(text).not.toContain(tool);
      }
    });

    it("only routes to workflows that ship, and never to itself", () => {
      const routes = [
        ...prose(body).matchAll(/\buse `([a-z]+)`/g),
        ...description.matchAll(/ use ([a-z]+)\b/g),
      ].map((m) => m[1]!);
      for (const target of routes) {
        expect(SKILL_NAMES, `${name} routes to ${target}`).toContain(target);
        expect(target).not.toBe(name);
      }
    });

    it("only names MCP servers that are bundled", () => {
      const titles = MCPS.map((m) => m.title);
      // Server names a workflow might mention. If one is dropped from mcps.ts, this fails.
      for (const title of ["Context7", "Microsoft Learn", "AWS Knowledge", "Cloudflare Docs"]) {
        if (body.includes(title)) expect(titles, title).toContain(title);
      }
    });

    it("pre-approves only read-only tools and scoped git commands", () => {
      const tools = (data["allowed-tools"] ?? "").split(/,\s*/).filter(Boolean);
      expect(tools.length).toBeGreaterThan(0);
      for (const tool of tools) {
        expect(READ_ONLY_TOOLS.has(tool) || SCOPED_GIT.test(tool), tool).toBe(true);
      }
      const manual = data["disable-model-invocation"] === "true";
      if (tools.some((t) => WRITING_GIT.test(t))) expect(manual, "writes need manual").toBe(true);
    });

    it("uses plain punctuation", () => {
      expect(body).not.toMatch(/\u2014/);
      expect(description).not.toMatch(/\u2014/);
    });
  });

  it("lists every bundled subagent in summon, and nothing else", () => {
    const { body } = load("summon");
    const start = body.indexOf("godmode adds");
    const listed = [...body.slice(start, body.indexOf("\n\n", start)).matchAll(/`([a-z]+)`/g)];
    expect(listed.map((m) => m[1]).sort()).toEqual(AGENT_NAMES);
  });

  it("keeps the commit workflow manual in both engines", () => {
    const { data } = load("covenant");
    expect(data["disable-model-invocation"]).toBe("true");
    const policy = readFileSync(join(SKILLS_DIR, "covenant", "agents", "openai.yaml"), "utf8");
    expect(policy).toMatch(/^policy:\n {2}allow_implicit_invocation: false$/m);
    const others = SKILL_NAMES.filter((n) => n !== "covenant");
    for (const n of others) {
      expect(load(n).data["disable-model-invocation"], n).toBeUndefined();
      expect(existsSync(join(SKILLS_DIR, n, "agents")), n).toBe(false);
    }
  });
});

describe("subagent lint", () => {
  it.each(AGENT_NAMES)("%s declares a description and tools that exist", (name) => {
    const { data, body } = parseFrontmatter(
      readFileSync(join(ROOT, "plugin", "agents", `${name}.md`), "utf8"),
    );
    expect((data.description ?? "").length).toBeGreaterThan(60);
    const tools = (data.tools ?? "").split(/,\s*/).filter(Boolean);
    const current = ["Read", "Grep", "Glob", "Edit", "Write", "Bash"];
    for (const tool of tools) expect(current, `${name}: ${tool}`).toContain(tool);
    // Plugin subagents ignore these fields, so declaring them would be a silent no-op.
    for (const key of ["hooks", "mcpServers", "permissionMode"]) expect(data[key]).toBeUndefined();
    expect(body).toMatch(/^## (Report|Verdict)$/m);
  });
});
