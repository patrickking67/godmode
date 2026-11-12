import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { FakeDocument, type FakeElement } from "./fake-dom.js";

/**
 * Runs the real `site/main.js` against a small fake DOM and drives the copy buttons, the
 * workflow tabs and the theme toggle the way a visitor would. No browser is involved, so
 * this covers the script's logic; layout and real clipboard access are checked by hand.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = readFileSync(join(ROOT, "site", "main.js"), "utf8");
const HTML = readFileSync(join(ROOT, "site", "index.html"), "utf8");
const CATALOG = JSON.parse(readFileSync(join(ROOT, "site", "data", "godmode.json"), "utf8")) as {
  pillars: string[];
  commands: { name: string; pillar: string; description: string; steps: string[] }[];
};

/** The two install commands exactly as the page's copy buttons carry them. */
const COPY_TEXT = [...HTML.matchAll(/data-copy="([^"]+)"/g)].map((m) =>
  m[1]!.replace(/&#10;/g, "\n"),
);

interface Options {
  clipboard?: "ok" | "rejects" | "missing";
  storage?: "ok" | "blocked";
  system?: "light" | "dark";
  stored?: "light" | "dark";
}

async function load(options: Options = {}) {
  const doc = new FakeDocument();
  const html = doc.documentElement;
  if (options.stored) html.setAttribute("data-theme", options.stored);
  for (const media of ["dark", "light"]) {
    doc.add(doc.head, "meta", { name: "theme-color", content: media, "data-media": media });
  }
  const navToggle = doc.add(doc.body, "button", { class: "nav-toggle", "aria-expanded": "false" });
  const navLinks = doc.add(doc.body, "div", { id: "nav-links", class: "nav-links" });
  const navLink = doc.add(navLinks, "a", {}, "Workflows");
  const themeToggle = doc.add(doc.body, "button", { class: "theme-toggle" });
  const copyButtons = COPY_TEXT.map((text) => {
    const button = doc.add(doc.body, "button", { class: "copy-btn", "data-copy": text });
    doc.add(button, "span", { class: "copy-label" }, "Copy");
    return button;
  });
  const commandsRoot = doc.add(doc.body, "div", { id: "commands-root", "data-fallback": "" });
  doc.add(commandsRoot, "p", {}, "static fallback");

  const written: string[] = [];
  const clipboard =
    options.clipboard === "missing"
      ? undefined
      : {
          writeText: (text: string) =>
            options.clipboard === "rejects"
              ? Promise.reject(new Error("denied"))
              : Promise.resolve(void written.push(text)),
        };
  const stored = new Map<string, string>();
  const localStorage = {
    setItem(key: string, value: string) {
      if (options.storage === "blocked") throw new Error("SecurityError");
      stored.set(key, value);
    },
  };
  const warnings: unknown[] = [];
  const window = {
    setTimeout,
    clearTimeout,
    localStorage,
    console: { warn: (...args: unknown[]) => warnings.push(args) },
    matchMedia: (query: string) => ({
      matches: query.includes("light") && options.system === "light",
      addEventListener() {},
    }),
  };
  runInNewContext(SCRIPT, {
    window,
    document: doc,
    navigator: { clipboard },
    console: window.console,
    fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(CATALOG) }),
  });
  await vi.advanceTimersByTimeAsync(0);
  const label = (button: FakeElement) => button.querySelector(".copy-label")!.textContent;
  return {
    doc,
    html,
    navToggle,
    navLinks,
    navLink,
    themeToggle,
    copyButtons,
    commandsRoot,
    written,
    stored,
    warnings,
    label,
  };
}

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe("copy buttons", () => {
  it("copy both install commands, say so, then reset", async () => {
    const page = await load();
    expect(COPY_TEXT).toHaveLength(2);
    for (const [i, button] of page.copyButtons.entries()) {
      button.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(page.written.at(-1)).toBe(COPY_TEXT[i]);
      expect(page.label(button)).toBe("Copied");
      expect(button.classList.contains("is-copied")).toBe(true);
      await vi.advanceTimersByTimeAsync(1800);
      expect(page.label(button)).toBe("Copy");
      expect(button.classList.contains("is-copied")).toBe(false);
    }
  });

  it("keep the message up for the full time after a second click", async () => {
    const page = await load();
    const button = page.copyButtons[0]!;
    button.click();
    await vi.advanceTimersByTimeAsync(1200);
    button.click();
    await vi.advanceTimersByTimeAsync(900);
    // 2100 ms after the first click: its timer must not have reset the label.
    expect(page.label(button)).toBe("Copied");
    await vi.advanceTimersByTimeAsync(900);
    expect(page.label(button)).toBe("Copy");
  });

  it.each([
    ["is missing", "missing"],
    ["rejects the write", "rejects"],
  ] as const)(
    "fall back to a selection copy when the Clipboard API %s, and return focus",
    async (_case, clipboard) => {
      const page = await load({ clipboard });
      const button = page.copyButtons[1]!;
      button.focus();
      button.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(page.doc.copied).toBe(COPY_TEXT[1]);
      expect(page.label(button)).toBe("Copied");
      expect(page.doc.activeElement).toBe(button);
      expect(page.doc.body.querySelectorAll("textarea")).toEqual([]);
    },
  );

  it("tell the visitor to copy by hand when nothing works", async () => {
    const page = await load({ clipboard: "missing" });
    page.doc.execCommandResult = false;
    const button = page.copyButtons[0]!;
    button.click();
    expect(page.label(button)).toBe("Select and copy");
    expect(button.classList.contains("is-copied")).toBe(false);
    await vi.advanceTimersByTimeAsync(1800);
    expect(page.label(button)).toBe("Copy");
  });
});

describe("workflow tabs", () => {
  const order = CATALOG.pillars.flatMap((pillar) =>
    CATALOG.commands.filter((c) => c.pillar === pillar).map((c) => c.name),
  );
  const tabsOf = (root: FakeElement) => root.querySelectorAll('button[role="tab"]');
  const selected = (root: FakeElement) =>
    tabsOf(root)
      .filter((t) => t.getAttribute("aria-selected") === "true")
      .map((t) => t.getAttribute("data-name"));
  const panelTitle = (root: FakeElement) =>
    root.querySelector(".wf-detail")!.querySelector("h3")!.textContent;

  it("replace the static list with one tab per workflow and select the first", async () => {
    const { commandsRoot } = await load();
    expect(commandsRoot.getAttribute("data-fallback")).toBeNull();
    expect(tabsOf(commandsRoot).map((t) => t.getAttribute("data-name"))).toEqual(order);
    expect(order).toHaveLength(CATALOG.commands.length);
    expect(selected(commandsRoot)).toEqual([order[0]]);
    expect(panelTitle(commandsRoot)).toBe(`/godmode:${order[0]}`);
  });

  it("give the tablist only tabs and presentational group headings", async () => {
    const { commandsRoot } = await load();
    const list = commandsRoot.querySelector('div[role="tablist"]')!;
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    const headings = list.children.filter((c) => c.getAttribute("role") !== "tab");
    expect(headings.map((h) => h.textContent)).toEqual(CATALOG.pillars);
    for (const heading of headings) expect(heading.getAttribute("role")).toBe("presentation");
    const ids = headings.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tab of tabsOf(commandsRoot))
      expect(ids).toContain(tab.getAttribute("aria-describedby"));
  });

  it("show the clicked workflow's panel and keep one tab in the tab order", async () => {
    const { commandsRoot } = await load();
    for (const tab of tabsOf(commandsRoot)) {
      tab.click();
      const name = tab.getAttribute("data-name")!;
      const command = CATALOG.commands.find((c) => c.name === name)!;
      const panels = commandsRoot.querySelectorAll('div[role="tabpanel"]');
      expect(panels).toHaveLength(1);
      const panel = panels[0]!;
      expect(panel.id).toBe(tab.getAttribute("aria-controls"));
      expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
      expect(panelTitle(commandsRoot)).toBe(`/godmode:${name}`);
      expect(panel.querySelector(".wf-desc")!.textContent).toBe(command.description);
      expect(panel.querySelectorAll("ol li").map((li) => li.textContent)).toEqual(command.steps);
      expect(selected(commandsRoot)).toEqual([name]);
      expect(tabsOf(commandsRoot).filter((t) => t.tabIndex === 0)).toEqual([tab]);
    }
  });

  it("move with the arrow keys, Home and End, wrapping at both ends", async () => {
    const { commandsRoot, doc } = await load();
    const tabs = tabsOf(commandsRoot);
    tabs[0]!.focus();
    const press = (key: string) => {
      const event = doc.activeElement.dispatch("keydown", { key });
      return [
        doc.activeElement.getAttribute("data-name"),
        selected(commandsRoot)[0],
        event.defaultPrevented,
      ];
    };
    expect(press("ArrowDown")).toEqual([order[1], order[1], true]);
    expect(press("ArrowRight")).toEqual([order[2], order[2], true]);
    expect(press("ArrowLeft")).toEqual([order[1], order[1], true]);
    expect(press("ArrowUp")).toEqual([order[0], order[0], true]);
    expect(press("ArrowUp")).toEqual([order.at(-1), order.at(-1), true]);
    expect(press("ArrowDown")).toEqual([order[0], order[0], true]);
    expect(press("End")).toEqual([order.at(-1), order.at(-1), true]);
    expect(press("Home")).toEqual([order[0], order[0], true]);
    expect(press("a")).toEqual([order[0], order[0], false]);
    expect(panelTitle(commandsRoot)).toBe(`/godmode:${order[0]}`);
  });
});

describe("theme toggle", () => {
  const colors = (doc: FakeDocument) =>
    doc.querySelectorAll('meta[name="theme-color"]').map((m) => m.getAttribute("content"));

  it("names the theme it switches to, from the system setting", async () => {
    expect((await load({ system: "dark" })).themeToggle.getAttribute("aria-label")).toBe(
      "Switch to light theme",
    );
    expect((await load({ system: "light" })).themeToggle.getAttribute("aria-label")).toBe(
      "Switch to dark theme",
    );
    const stored = await load({ system: "light", stored: "dark" });
    expect(stored.themeToggle.getAttribute("aria-label")).toBe("Switch to light theme");
  });

  it("switches the theme, remembers it and updates theme-color", async () => {
    const page = await load({ system: "dark" });
    expect(page.html.getAttribute("data-theme")).toBeNull();
    page.themeToggle.click();
    expect(page.html.getAttribute("data-theme")).toBe("light");
    expect(page.stored.get("godmode-theme")).toBe("light");
    expect(colors(page.doc)).toEqual(["#f7f6fb", "#f7f6fb"]);
    expect(page.themeToggle.getAttribute("aria-label")).toBe("Switch to dark theme");
    page.themeToggle.click();
    expect(page.html.getAttribute("data-theme")).toBe("dark");
    expect(page.stored.get("godmode-theme")).toBe("dark");
    expect(colors(page.doc)).toEqual(["#0a0a0f", "#0a0a0f"]);
  });

  it("still switches when localStorage throws", async () => {
    const page = await load({ system: "light", storage: "blocked" });
    expect(() => page.themeToggle.click()).not.toThrow();
    expect(page.html.getAttribute("data-theme")).toBe("dark");
    expect(page.stored.size).toBe(0);
  });
});

describe("mobile menu", () => {
  it("opens, closes on a link click and closes on Escape with focus back on the button", async () => {
    const page = await load();
    page.navToggle.click();
    expect(page.navToggle.getAttribute("aria-expanded")).toBe("true");
    expect(page.navLinks.classList.contains("is-open")).toBe(true);
    page.navLink.click();
    expect(page.navToggle.getAttribute("aria-expanded")).toBe("false");
    page.navToggle.click();
    page.navLink.focus();
    page.navLink.dispatch("keydown", { key: "Escape" });
    expect(page.navLinks.classList.contains("is-open")).toBe(false);
    expect(page.doc.activeElement).toBe(page.navToggle);
  });
});
