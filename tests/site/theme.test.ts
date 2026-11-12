import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

/**
 * The site has a dark and a light theme. These tests read the stylesheet's tokens and
 * fail when the two copies of the light tokens drift apart, when a text color drops
 * below WCAG AA on a surface it is used on, or when the page could paint the wrong theme
 * before the stored choice is applied.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = readFileSync(join(ROOT, "site", "styles.css"), "utf8");
const html = readFileSync(join(ROOT, "site", "index.html"), "utf8");
const js = readFileSync(join(ROOT, "site", "main.js"), "utf8");

type Tokens = Record<string, string>;

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  return css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
}

function tokens(body: string): Tokens {
  const out: Tokens = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+|color-scheme):\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.replace(/\s+/g, " ").trim();
  }
  return out;
}

const DARK = tokens(block(":root"));
const LIGHT_SYSTEM = tokens(block(':root:not([data-theme="dark"])'));
const LIGHT_CHOSEN = tokens(block(':root[data-theme="light"]'));
const LIGHT = { ...DARK, ...LIGHT_CHOSEN };

type Rgb = [number, number, number];

function rgb(value: string): { color: Rgb; alpha: number } {
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const n = parseInt(hex, 16);
    return { color: [n >> 16, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const parts = value
    .match(/^rgba?\(([^)]+)\)$/)?.[1]
    ?.split(",")
    .map((p) => Number(p.trim()));
  if (!parts || parts.length < 3) throw new Error(`not a color: ${value}`);
  return { color: [parts[0]!, parts[1]!, parts[2]!], alpha: parts[3] ?? 1 };
}

function over(top: string, under: Rgb): Rgb {
  const { color, alpha } = rgb(top);
  return color.map((c, i) => c * alpha + under[i]! * (1 - alpha)) as Rgb;
}

function luminance(color: Rgb): number {
  const [r, g, b] = color.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const THEMES: [string, Tokens][] = [
  ["dark", DARK],
  ["light", LIGHT],
];

describe("site themes", () => {
  it("declares the light tokens identically for the system setting and the stored choice", () => {
    expect(LIGHT_SYSTEM).toEqual(LIGHT_CHOSEN);
    expect(LIGHT_CHOSEN["color-scheme"]).toBe("light");
    expect(DARK["color-scheme"]).toBe("dark");
    expect(css).toMatch(
      /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\) \{/,
    );
  });

  it("only overrides tokens the dark theme defines", () => {
    for (const name of Object.keys(LIGHT_CHOSEN)) expect(DARK, name).toHaveProperty(name);
  });

  it("keeps color values in the tokens, not in the rules", () => {
    const rules = css.slice(css.indexOf("}", css.indexOf(':root[data-theme="light"] {')));
    const hex = [...rules.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0]);
    // White on the violet skip link is the one fixed pair; it holds in both themes.
    expect(hex.filter((h) => h !== "#fff")).toEqual([]);
  });

  it.each(THEMES)("meets WCAG AA for body text on every page surface (%s)", (_name, t) => {
    const surfaces = ["--bg", "--bg-2", "--panel"].map((s) => rgb(t[s]!).color);
    const page = rgb(t["--bg"]!).color;
    // Hover, inline code and selected-tab tints sit on top of a surface.
    for (const base of surfaces) {
      for (const tint of [null, "--hover", "--chip", "--accent-soft"]) {
        const bg = tint ? over(t[tint]!, base) : base;
        for (const text of ["--text", "--text-soft", "--text-dim", "--muted", "--accent"]) {
          expect(
            contrast(rgb(t[text]!).color, bg),
            `${text} on ${tint ?? "surface"}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    expect(
      contrast(rgb(t["--diagram-sub"]!).color, rgb(t["--bg-2"]!).color),
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast([255, 255, 255], rgb(t["--violet"]!).color)).toBeGreaterThanOrEqual(4.5);
    // Focus ring and diagram lines are graphics: 3:1 against the page.
    expect(contrast(rgb(t["--accent"]!).color, page)).toBeGreaterThanOrEqual(3);
    expect(contrast(rgb(t["--edge"]!).color, rgb(t["--panel"]!).color)).toBeGreaterThanOrEqual(3);
    expect(contrast(rgb(t["--ok"]!).color, rgb(t["--bg-2"]!).color)).toBeGreaterThanOrEqual(3);
  });

  it.each(THEMES)("meets WCAG AA inside code blocks (%s)", (_name, t) => {
    const code = rgb(t["--code-bg"]!).color;
    for (const text of ["--code-text", "--code-text-soft", "--code-dim", "--code-ok"]) {
      expect(contrast(rgb(t[text]!).color, code), text).toBeGreaterThanOrEqual(4.5);
    }
    const button = rgb(t["--code-btn"]!).color;
    for (const text of ["--code-btn-text", "--code-ok"]) {
      expect(contrast(rgb(t[text]!).color, button), text).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("applies a stored choice before the stylesheet loads, so the wrong theme never paints", () => {
    const script = html.indexOf('localStorage.getItem("godmode-theme")');
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(html.indexOf('rel="stylesheet"'));
    const inline = html.slice(
      html.lastIndexOf("<script>", script),
      html.indexOf("</script>", script),
    );
    expect(inline).not.toMatch(/\bsrc=|defer|async/);
    expect(inline).toContain('setAttribute("data-theme", savedTheme)');
    expect(inline).toMatch(/savedTheme === "light" \|\| savedTheme === "dark"/);
  });

  it("wraps every localStorage access in try/catch", () => {
    for (const [name, source] of [
      ["index.html", html],
      ["main.js", js],
    ] as const) {
      const uses = [...source.matchAll(/localStorage\.(getItem|setItem|removeItem)/g)];
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) {
        const before = source.slice(0, use.index);
        const opened = before.lastIndexOf("try {");
        expect(opened, name).toBeGreaterThan(-1);
        expect(before.slice(opened), name).not.toContain("} catch");
      }
    }
  });

  it("tells the browser about both themes and uses each page background as theme-color", () => {
    expect(html).toContain('<meta name="color-scheme" content="dark light" />');
    const metas = [
      ...html.matchAll(
        /<meta name="theme-color" content="([^"]+)" media="\(prefers-color-scheme: (\w+)\)"/g,
      ),
    ].map((m) => [m[2], m[1]]);
    expect(metas).toEqual([
      ["dark", DARK["--bg"]],
      ["light", LIGHT["--bg"]],
    ]);
    for (const source of [html, js]) {
      expect(source).toContain(`"${DARK["--bg"]}"`);
      expect(source).toContain(`"${LIGHT["--bg"]}"`);
    }
  });

  it("ships a labelled toggle button that is hidden when JavaScript is off", () => {
    expect(html).toMatch(/<button class="theme-toggle" type="button" aria-label="Switch theme">/);
    expect(css).toMatch(/html:not\(\.js\) \.theme-toggle \{\s*display: none;/);
    expect(js).toContain(
      '"Switch to " + (activeTheme() === "light" ? "dark" : "light") + " theme"',
    );
  });
});
