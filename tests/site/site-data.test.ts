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

describe("site without JavaScript", () => {
  const html = readFileSync(join(ROOT, "site", "index.html"), "utf8");

  it("ships every command in the static fallback markup", () => {
    const start = html.indexOf('id="commands-root"');
    const end = html.indexOf("</noscript>", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const fallback = html.slice(start, end);
    for (const c of site.commands) {
      expect(fallback).toContain(`<span class="slash">/</span>${c.name}</p>`);
    }
  });

  it("only hides reveal content once the page marks itself as running JavaScript", () => {
    const css = readFileSync(join(ROOT, "site", "styles.css"), "utf8");
    expect(html).toContain('document.documentElement.classList.add("js")');
    expect(css).not.toMatch(/^\.reveal\s*\{/m);
    expect(css).toMatch(/^\.js \.reveal\s*\{/m);
  });

  it("points social cards at an absolute PNG that exists", () => {
    const og = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] ?? "";
    expect(og).toBe("https://patrickking67.github.io/godmode/assets/og-image.png");
    expect(() => readFileSync(join(ROOT, "site", "assets", "og-image.png"))).not.toThrow();
  });
});

describe("llms.txt", () => {
  it("is published with the site and mirrored at the repo root", () => {
    const published = readFileSync(join(ROOT, "site", "llms.txt"), "utf8");
    expect(readFileSync(join(ROOT, "llms.txt"), "utf8")).toBe(published);
    expect(published.startsWith("# Godmode\n\n> ")).toBe(true);
    for (const section of ["## Docs", "## Source", "## Live demo", "## Optional"]) {
      expect(published).toContain(`\n${section}\n`);
    }
    for (const url of published.match(/\]\(([^)]+)\)/g) ?? []) {
      expect(url).toMatch(/^\]\(https:\/\//);
    }
  });
});
