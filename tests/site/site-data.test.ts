import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { MCPS } from "../../src/plugin/_sources/mcps.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface SiteData {
  commands: { name: string }[];
  connectors: { slug: string; title: string; category: string; blurb: string }[];
}

const site = JSON.parse(
  readFileSync(join(ROOT, "site", "data", "godmode.json"), "utf8"),
) as SiteData;

describe("site data parity", () => {
  it("lists exactly the plugin's commands", () => {
    const cmdDir = join(ROOT, "src", "plugin", "_sources", "commands");
    const expected = readdirSync(cmdDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();
    const actual = site.commands.map((c) => c.name).sort();
    expect(actual).toEqual(expected);
  });

  it("lists exactly the plugin's connectors, cleanly titled", () => {
    const key = (x: { slug: string }) => x.slug;
    const expected = MCPS.map((m) => ({ slug: m.name, title: m.title, category: m.category })).sort(
      (a, b) => key(a).localeCompare(key(b)),
    );
    const actual = site.connectors
      .map((c) => ({ slug: c.slug, title: c.title, category: c.category }))
      .sort((a, b) => key(a).localeCompare(key(b)));
    expect(actual).toEqual(expected);

    for (const c of site.connectors) {
      expect(c.title.trim().length).toBeGreaterThan(0);
      expect(c.category.trim().length).toBeGreaterThan(0);
      expect(c.blurb.trim().length).toBeGreaterThan(0);
    }
  });
});
