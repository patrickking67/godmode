import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { MCPS } from "../../src/plugin/_sources/mcps.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface SiteData {
  commands: { name: string; purpose: string; steps: string[] }[];
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

  it("shows each workflow's purpose and every server endpoint in the static markup", () => {
    const decode = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
    const text = decode(html).replace(/\s+/g, " ");
    for (const c of site.commands) expect(text, c.name).toContain(c.purpose);
    for (const m of MCPS) {
      const endpoint = m.url ?? [m.command, ...(m.args ?? [])].join(" ");
      expect(text, m.name).toContain(`<code>${endpoint}</code>`);
    }
  });

  it("shows the sanctify procedure in the demo exactly as the skill defines it", () => {
    const steps = site.commands.find((c) => c.name === "sanctify")!.steps;
    const start = html.indexOf('id="demo-steps"');
    const listed = [
      ...html.slice(start, html.indexOf("</ol>", start)).matchAll(/<li>(.+?)<\/li>/g),
    ];
    expect(listed.map((m) => m[1])).toEqual(steps);
  });

  it("puts both install commands in the hero with matching copy buttons", () => {
    const hero = html.slice(html.indexOf('class="hero"'), html.indexOf('id="workflows"'));
    const copies = [...hero.matchAll(/data-copy="([^"]+)"/g)].map((m) => m[1]!.split("&#10;"));
    expect(copies).toEqual([
      ["/plugin marketplace add patrickking67/godmode", "/plugin install godmode@godmode"],
      ["codex plugin marketplace add patrickking67/godmode", "codex plugin add godmode@godmode"],
    ]);
    for (const line of copies.flat()) expect(hero).toContain(line);
  });

  it("loads no third-party scripts, styles or fonts", () => {
    const external = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(https?:[^"]+)"/g)];
    expect(
      external.map((m) => m[1]).filter((u) => !u!.includes("patrickking67.github.io")),
    ).toEqual([]);
    const css = readFileSync(join(ROOT, "site", "styles.css"), "utf8");
    expect(css).not.toMatch(/@import|url\(\s*["']?https?:/);
  });

  it("only hides reveal content once the page marks itself as running JavaScript", () => {
    const css = readFileSync(join(ROOT, "site", "styles.css"), "utf8");
    expect(html).toContain('document.documentElement.classList.add("js")');
    expect(css).not.toMatch(/^\.reveal\s*\{/m);
    expect(css).toMatch(/^\.js \.hero \.reveal\s*\{/m);
  });

  it("points social cards at an absolute PNG that exists", () => {
    const og = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] ?? "";
    expect(og).toBe("https://patrickking67.github.io/godmode/assets/og-image.png");
    expect(() => readFileSync(join(ROOT, "site", "assets", "og-image.png"))).not.toThrow();
  });
});

describe("README screenshots", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const shots = [
    ["desktop", 1280, 800],
    ["mobile", 390, 844],
  ] as const;

  it.each(shots)(
    "ships a %s capture per theme at %dx%d, each under 300 KB",
    (name, width, height) => {
      for (const theme of ["dark", "light"]) {
        const png = readFileSync(join(ROOT, "docs", "assets", `site-${name}-${theme}.png`));
        expect(png.subarray(1, 4).toString("latin1"), theme).toBe("PNG");
        // Width and height are the first two fields of the IHDR chunk.
        expect([png.readUInt32BE(16), png.readUInt32BE(20)], theme).toEqual([width, height]);
        expect(png.length, theme).toBeLessThan(300 * 1024);
      }
    },
  );

  it.each(shots)("shows the %s capture that matches the reader's color scheme", (name) => {
    const picture = new RegExp(
      `<picture>\\s*<source media="\\(prefers-color-scheme: dark\\)" srcset="docs/assets/site-${name}-dark\\.png" />` +
        `\\s*<img src="docs/assets/site-${name}-light\\.png" alt="[^"]{20,}" width="\\d+" />\\s*</picture>`,
    );
    expect(readme).toMatch(picture);
  });
});

describe("llms.txt", () => {
  it("is published with the site and mirrored at the repo root", () => {
    const published = readFileSync(join(ROOT, "site", "llms.txt"), "utf8");
    expect(readFileSync(join(ROOT, "llms.txt"), "utf8")).toBe(published);
    expect(published.startsWith("# Godmode\n\n> ")).toBe(true);
    for (const section of ["## Docs", "## Source", "## Live site", "## Optional"]) {
      expect(published).toContain(`\n${section}\n`);
    }
    for (const url of published.match(/\]\(([^)]+)\)/g) ?? []) {
      expect(url).toMatch(/^\]\(https:\/\//);
    }
  });
});
