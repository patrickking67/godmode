# Godmode: Pages Site + Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a masterful GitHub Pages landing site and fix the Critical, High, and Medium usability, compatibility, and functionality defects in the Godmode plugin, reconciling the version to 1.3.0.

**Architecture:** The plugin is generated from `src/plugin/_sources/` by `scripts/build-plugin.ts` into a committed `plugin/` tree. Source edits are followed by `pnpm build:plugin` and the regenerated `plugin/` is committed in the same task, so the tree never drifts. The site is a separate, buildless static `site/` directory deployed by its own GitHub Actions workflow, isolated from the plugin pipeline.

**Tech Stack:** TypeScript, Node 22, pnpm, vitest, ajv; static HTML/CSS/JS for the site; GitHub Actions for Pages.

**Conventions for every task (read before each task):**

- **No em dashes** in any file you create or edit (copy, code comments, JSON, Markdown, commit messages). Use a colon, comma, parentheses, "to" for ranges, or a separate sentence. (Where this plan quotes existing text to remove, that "before" snippet may still contain an em dash; the replacement you write must not.)
- **Use the web connectors where they help:** Context7 for current library/CLI docs, DeepWiki and grep.app for reference patterns, Playwright or Chrome DevTools to verify the site in a real browser, Microsoft Learn / AWS Knowledge / Cloudflare Docs when a task touches those platforms. Note which you used.
- **Source of truth:** edit `src/plugin/_sources/`, never `plugin/` directly. After any source change, run `pnpm build:plugin` and commit the regenerated `plugin/` in the same commit.
- **No AI attribution** in commits (no `Co-Authored-By`, no "Generated with"). Author as the configured git identity only.
- **Green before commit:** the task's tests and `pnpm typecheck && pnpm lint` pass, and `git status` is clean of unintended changes, before you commit.

Spec: `docs/specs/2026-05-28-godmode-site-and-hardening-design.md`.

---

## Task 1: Fix `pnpm build` and prune phantom package entries (C1, C2)

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Confirm the build is broken**

Run: `pnpm build`
Expected: FAIL with `sh: vite: command not found`.

- [ ] **Step 2: Replace the `build` script**

In `package.json`, change the `build` script from:

```json
    "build": "tsc -p tsconfig.build.json && vite build && node scripts/build-plugin.ts",
```

to:

```json
    "build": "tsx scripts/build-plugin.ts",
```

(The emitter is a TypeScript file run via `tsx`; `vite` and the `tsc` emit step are unused now that no `dist/` is shipped. Whole-project type-checking already lives in `pnpm typecheck`.)

- [ ] **Step 3: Remove phantom CLI and packaging entries**

In `package.json`, delete the `bin` block:

```json
  "bin": {
    "godmode": "./dist/cli/index.js"
  },
```

In `scripts`, delete the `dev` and `doctor` lines (they point at a non-existent `src/cli/`):

```json
    "dev": "tsx watch src/cli/dev.ts",
```

```json
    "doctor": "tsx src/cli/doctor.ts"
```

Change `files` from `["dist", "LICENSE", "NOTICE", "README.md"]` to:

```json
  "files": ["plugin", "LICENSE", "NOTICE", "README.md", "CHANGELOG.md"],
```

- [ ] **Step 4: Verify build and checks pass**

Run: `pnpm build`
Expected: prints `godmode plugin built ...` with `9 commands, 9 skills, 5 agents, 3 hooks, 10 MCP servers`.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

Run: `git status --porcelain`
Expected: only `package.json` modified (the build is idempotent, so `plugin/` does not change).

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "fix: repair pnpm build and drop phantom CLI/package entries"
```

---

## Task 2: Parameterize `build(outDir)` so tests stop mutating committed files (D1)

**Files:**

- Modify: `scripts/build-plugin.ts`
- Test: `tests/plugin/build.test.ts` (full rewrite)

- [ ] **Step 1: Show the failing condition**

Run: `pnpm test` then `git status --porcelain`
Expected today: the test run leaves `plugin/` and `.claude-plugin/marketplace.json` regenerated in place (they may show as modified if anything differs, and the test mutates tracked files regardless). The goal of this task is that a test run touches nothing tracked.

- [ ] **Step 2: Add an options parameter to `build()`**

In `scripts/build-plugin.ts`, change the signature and resolve target dirs at the top of the function body. Replace:

```ts
export function build(): BuildResult {
  const commands = readCommands();
  const standaloneSkills = readStandaloneSkills();
  const agents = readAgents();
  const hooks = readHooks();

  // Clean previous output for a deterministic, idempotent build.
  rmSync(PLUGIN, { recursive: true, force: true });
  rmSync(join(ROOT, ".claude-plugin", "marketplace.json"), { force: true });
```

with:

```ts
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
```

- [ ] **Step 3: Replace every `PLUGIN` and marketplace path inside `build()` with the locals**

In the body of `build()` (only inside the function), change these write calls:

```ts
write(join(PLUGIN, ".claude-plugin", "plugin.json"), json(claude));
write(join(PLUGIN, ".codex-plugin", "plugin.json"), json(codex));
write(join(ROOT, ".claude-plugin", "marketplace.json"), json(marketplaceCatalog()));

write(join(PLUGIN, ".mcp.json"), claudeMcpJson(MCPS));
write(join(PLUGIN, "codex-config.toml"), codexMcpToml(MCPS));
write(join(PLUGIN, "codex-mcp-setup.sh"), codexMcpSetupScript(MCPS));
```

to:

```ts
write(join(pluginDir, ".claude-plugin", "plugin.json"), json(claude));
write(join(pluginDir, ".codex-plugin", "plugin.json"), json(codex));
write(join(marketplaceDir, "marketplace.json"), json(marketplaceCatalog()));

write(join(pluginDir, ".mcp.json"), claudeMcpJson(MCPS));
write(join(pluginDir, "codex-config.toml"), codexMcpToml(MCPS));
write(join(pluginDir, "codex-mcp-setup.sh"), codexMcpSetupScript(MCPS));
```

And the loops further down:

```ts
write(join(PLUGIN, "commands", `${cmd.name}.md`), claudeCommand(cmd));
```

becomes `write(join(pluginDir, "commands", ...`;

```ts
write(join(PLUGIN, "skills", cmd.name, "SKILL.md"), skillFromCommand(cmd));
```

becomes `write(join(pluginDir, "skills", ...`;

```ts
write(join(PLUGIN, "skills", skill.name, "SKILL.md"), skill.raw);
```

becomes `write(join(pluginDir, "skills", ...`;

```ts
write(join(PLUGIN, "agents", `${agent.name}.md`), agent.raw);
```

becomes `write(join(pluginDir, "agents", ...`;

```ts
write(join(PLUGIN, "hooks", h.file), h.raw);
```

becomes `write(join(pluginDir, "hooks", h.file), h.raw);`.

Leave the direct-invocation block at the bottom (`if (process.argv[1] ...) { const r = build(); ... }`) unchanged: it calls `build()` with no args, so it writes to the real `PLUGIN` as before.

- [ ] **Step 4: Rewrite the test to build into a temp dir**

Replace the entire contents of `tests/plugin/build.test.ts` with:

```ts
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { build, type BuildResult } from "../../scripts/build-plugin.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("build-plugin emitter", () => {
  let result: BuildResult;
  let TMP: string;
  let PLUGIN: string;
  let MARKETPLACE: string;

  beforeAll(() => {
    TMP = mkdtempSync(join(tmpdir(), "gm-build-"));
    PLUGIN = join(TMP, "plugin");
    MARKETPLACE = join(TMP, ".claude-plugin");
    result = build({ outDir: PLUGIN, marketplaceDir: MARKETPLACE });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("emits both engine manifests and a marketplace catalog", () => {
    expect(existsSync(join(PLUGIN, ".claude-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(PLUGIN, ".codex-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(MARKETPLACE, "marketplace.json"))).toBe(true);
  });

  it("uses a lowercase plugin name and the package.json version", () => {
    const claude = readJson(join(PLUGIN, ".claude-plugin", "plugin.json")) as Record<
      string,
      string
    >;
    const pkg = readJson(join(ROOT, "package.json")) as { version: string };
    expect(claude.name).toBe("godmode");
    expect(claude.version).toBe(pkg.version);
  });

  it("gives the Codex manifest skill/mcp pointers and an interface block", () => {
    const codex = readJson(join(PLUGIN, ".codex-plugin", "plugin.json")) as Record<string, unknown>;
    expect(codex.skills).toBe("./skills/");
    expect(codex.mcpServers).toBe("./.mcp.json");
    const iface = codex.interface as Record<string, unknown>;
    expect(iface.displayName).toBe("Godmode");
    expect(iface.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("emits each `both` command as a Claude command and a shared skill", () => {
    expect(existsSync(join(PLUGIN, "commands", "revelation.md"))).toBe(true);
    expect(existsSync(join(PLUGIN, "skills", "revelation", "SKILL.md"))).toBe(true);
    const cmd = readFileSync(join(PLUGIN, "commands", "revelation.md"), "utf8");
    expect(cmd).toMatch(/^---\nname: revelation\n/);
    expect(cmd).toContain("allowed-tools:");
  });

  it("emits the five themed subagents, each with a description (Claude-only)", () => {
    for (const name of ["oracle", "demiurge", "inquisitor", "arbiter", "seer"]) {
      const p = join(PLUGIN, "agents", `${name}.md`);
      expect(existsSync(p)).toBe(true);
      expect(readFileSync(p, "utf8")).toMatch(/^---\ndescription: /);
    }
    expect(result.agents).toBe(5);
  });

  it("emits hooks.json wiring three events plus its node scripts (Claude-only)", () => {
    const hooksJson = readJson(join(PLUGIN, "hooks", "hooks.json")) as {
      hooks: Record<string, unknown>;
    };
    expect(Object.keys(hooksJson.hooks).sort()).toEqual([
      "PostToolUse",
      "PreToolUse",
      "SessionStart",
    ]);
    for (const script of ["session-start.mjs", "guard-bash.mjs", "format-edit.mjs"]) {
      expect(existsSync(join(PLUGIN, "hooks", script))).toBe(true);
    }
    expect(result.hooks).toBe(3);
  });

  it("emits Claude MCP json (typed) and a Codex TOML snippet", () => {
    const mcp = readJson(join(PLUGIN, ".mcp.json")) as {
      mcpServers: Record<string, { type: string; url?: string }>;
    };
    expect(mcp.mcpServers["microsoft-learn"]).toEqual({
      type: "http",
      url: "https://learn.microsoft.com/api/mcp",
    });
    expect(mcp.mcpServers["context7"]).toMatchObject({ type: "stdio", command: "npx" });

    const toml = readFileSync(join(PLUGIN, "codex-config.toml"), "utf8");
    expect(toml).toContain("[mcp_servers.microsoft-learn]");
    expect(toml).toContain('url = "https://learn.microsoft.com/api/mcp"');
    expect(toml).toContain("[mcp_servers.context7]");
    expect(toml).toContain('command = "npx"');
  });

  it("emits a runnable Codex `mcp add` setup script for both transports", () => {
    const sh = readFileSync(join(PLUGIN, "codex-mcp-setup.sh"), "utf8");
    expect(sh).toMatch(/^#!\/usr\/bin\/env bash/);
    expect(sh).toContain(
      'codex mcp add microsoft-learn --url "https://learn.microsoft.com/api/mcp"',
    );
    expect(sh).toContain("codex mcp add context7 -- npx -y @upstash/context7-mcp");
  });
});
```

- [ ] **Step 5: Verify the test no longer mutates tracked files**

Run: `pnpm test`
Expected: PASS (9 tests in this file).

Run: `git status --porcelain`
Expected: only `scripts/build-plugin.ts` and `tests/plugin/build.test.ts` modified. The committed `plugin/` and `.claude-plugin/marketplace.json` are untouched by the test run.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-plugin.ts tests/plugin/build.test.ts
git commit -m "fix: build to a temp dir in tests so committed plugin/ is never mutated"
```

---

## Task 3: Emitter correctness and cleanly titled connectors (C4, C5, connector titles)

**Files:**

- Modify: `src/plugin/_sources/mcps.ts`
- Modify: `scripts/build-plugin.ts`
- Modify: `tests/plugin/build.test.ts`

- [ ] **Step 1: Add `title` and `category` to the connector type**

In `src/plugin/_sources/mcps.ts`, extend the interface. Change:

```ts
export interface McpServerDef {
  /** Server key used in `.mcp.json` and `[mcp_servers.<name>]`. */
  name: string;
  transport: McpTransport;
  description: string;
```

to:

```ts
export type McpCategory = "Docs" | "Code intelligence" | "Browser" | "Cloud";

export interface McpServerDef {
  /** Server key used in `.mcp.json` and `[mcp_servers.<name>]`. */
  name: string;
  /** Clean human display title (for example "AWS Knowledge"). */
  title: string;
  /** Grouping shown in docs and on the site. */
  category: McpCategory;
  transport: McpTransport;
  description: string;
```

- [ ] **Step 2: Give every connector a clean title and category**

In the `MCPS` array, add `title` and `category` to each entry, matching these exact values:

| name            | title           | category          |
| --------------- | --------------- | ----------------- |
| context7        | Context7        | Docs              |
| microsoft-learn | Microsoft Learn | Docs              |
| aws-knowledge   | AWS Knowledge   | Docs              |
| cloudflare-docs | Cloudflare Docs | Docs              |
| keeper-docs     | Keeper Docs     | Docs              |
| deepwiki        | DeepWiki        | Code intelligence |
| grep            | grep.app        | Code intelligence |
| playwright      | Playwright      | Browser           |
| chrome-devtools | Chrome DevTools | Browser           |
| azure           | Azure           | Cloud             |

For example, the first entry becomes:

```ts
  {
    name: "context7",
    title: "Context7",
    category: "Docs",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp"],
    description: "Up-to-date library & framework documentation, version-aware.",
  },
```

- [ ] **Step 3: Stop emitting `mcpServers` in the Codex manifest**

In `scripts/build-plugin.ts`, change `codexManifest()` so it does not inherit the Claude MCP pointer. Replace:

```ts
function codexManifest(): Record<string, unknown> {
  return {
    ...claudeManifest(),
    skills: "./skills/",
    interface: MANIFEST.interface,
  };
}
```

with:

```ts
function codexManifest(): Record<string, unknown> {
  // Codex registers MCP servers via `codex mcp add` (see codex-mcp-setup.sh),
  // not via a Claude-style `mcpServers` pointer, so omit it here.
  const { mcpServers: _omit, ...base } = claudeManifest();
  return {
    ...base,
    skills: "./skills/",
    interface: MANIFEST.interface,
  };
}
```

- [ ] **Step 4: Update the manifest schema (drop Codex `mcpServers` requirement, tighten interface)**

In `validateManifests()`, change the Codex schema. Replace:

```ts
const codexSchema = {
  type: "object",
  required: ["name", "version", "description", "skills", "mcpServers", "interface"],
  properties: {
    ...base,
    skills: { type: "string" },
    mcpServers: { type: "string" },
    interface: {
      type: "object",
      required: ["displayName", "shortDescription", "capabilities", "defaultPrompt", "brandColor"],
      properties: {
        displayName: { type: "string", minLength: 1 },
        shortDescription: { type: "string", minLength: 1 },
        capabilities: { type: "array", items: { type: "string" } },
        defaultPrompt: { type: "array", items: { type: "string" } },
        brandColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
      },
    },
  },
};
```

with:

```ts
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
```

- [ ] **Step 5: Update the Codex manifest test assertion**

In `tests/plugin/build.test.ts`, replace the test titled `"gives the Codex manifest skill/mcp pointers and an interface block"` with:

```ts
it("gives the Codex manifest a skill pointer and full interface, and no mcp pointer", () => {
  const codex = readJson(join(PLUGIN, ".codex-plugin", "plugin.json")) as Record<string, unknown>;
  expect(codex.skills).toBe("./skills/");
  expect(codex.mcpServers).toBeUndefined();
  const iface = codex.interface as Record<string, unknown>;
  expect(iface.displayName).toBe("Godmode");
  expect(iface.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  for (const key of ["longDescription", "developerName", "category", "websiteURL"]) {
    expect(typeof iface[key]).toBe("string");
    expect((iface[key] as string).length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 6: Rebuild and verify**

Run: `pnpm build:plugin`
Expected: build succeeds.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

Run: `grep -c mcpServers plugin/.codex-plugin/plugin.json`
Expected: `0`.

Run: `git status --porcelain`
Expected: `src/plugin/_sources/mcps.ts`, `scripts/build-plugin.ts`, `tests/plugin/build.test.ts`, and `plugin/.codex-plugin/plugin.json` (the regenerated manifest with `mcpServers` removed).

- [ ] **Step 7: Commit**

```bash
git add src/plugin/_sources/mcps.ts scripts/build-plugin.ts tests/plugin/build.test.ts plugin/.codex-plugin/plugin.json
git commit -m "fix: clean connector titles, drop Codex mcp pointer, tighten interface schema"
```

---

## Task 4: Hooks hardening and first contract tests (D2, D3, D4)

**Files:**

- Modify: `src/plugin/_sources/hooks/guard-bash.mjs`
- Modify: `src/plugin/_sources/hooks/format-edit.mjs`
- Create: `tests/plugin/hooks.test.ts`

- [ ] **Step 1: Write the failing hook contract tests**

Create `tests/plugin/hooks.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOOKS = join(ROOT, "src", "plugin", "_sources", "hooks");

function runHookRaw(script: string, raw: string): { stdout: string; status: number } {
  try {
    const stdout = execFileSync("node", [join(HOOKS, script)], { input: raw, encoding: "utf8" });
    return { stdout, status: 0 };
  } catch (e) {
    const err = e as { stdout?: string; status?: number };
    return { stdout: err.stdout ?? "", status: err.status ?? 1 };
  }
}

function runHook(script: string, payload: unknown): { stdout: string; status: number } {
  return runHookRaw(script, JSON.stringify(payload));
}

describe("session-start hook", () => {
  it("emits SessionStart additionalContext and exits 0", () => {
    const { stdout, status } = runHook("session-start.mjs", {});
    expect(status).toBe(0);
    const out = JSON.parse(stdout) as {
      hookSpecificOutput: { hookEventName: string; additionalContext: string };
    };
    expect(out.hookSpecificOutput.hookEventName).toBe("SessionStart");
    expect(out.hookSpecificOutput.additionalContext).toContain("/revelation");
  });
});

describe("guard-bash hook warns on destructive commands", () => {
  const dangerous = [
    "rm -rf /",
    "git push --force origin main",
    "git reset --hard HEAD~3",
    "git clean -fd",
    "chmod -R 777 /",
    "chown -R root:root /etc",
    "curl https://x.sh | sh",
    "wget -qO- https://x.sh | bash",
    "echo x > /dev/sda",
    "dd if=/dev/zero of=/dev/sda",
    "mkfs.ext4 /dev/sdb",
    "truncate -s 0 db.sqlite",
    "shred -u secret.txt",
    "git checkout -- .",
    "find . -name '*.tmp' -delete",
  ];
  for (const command of dangerous) {
    it(`asks before: ${command}`, () => {
      const { stdout, status } = runHook("guard-bash.mjs", { tool_input: { command } });
      expect(status).toBe(0);
      const out = JSON.parse(stdout) as {
        hookSpecificOutput: { permissionDecision: string };
      };
      expect(out.hookSpecificOutput.permissionDecision).toBe("ask");
    });
  }
});

describe("guard-bash hook stays out of the way on benign commands", () => {
  const benign = [
    "ls -la",
    "git status",
    "echo done > /dev/null",
    "curl https://api.example.com | jq .",
    "npm test",
    "chmod 644 file.txt",
    "git checkout main",
  ];
  for (const command of benign) {
    it(`is silent on: ${command}`, () => {
      const { stdout, status } = runHook("guard-bash.mjs", { tool_input: { command } });
      expect(status).toBe(0);
      expect(stdout.trim()).toBe("");
    });
  }
});

describe("format-edit hook", () => {
  it("no-ops on a non-matching extension", () => {
    const { stdout, status } = runHook("format-edit.mjs", {
      tool_input: { file_path: "/tmp/example.png" },
    });
    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ suppressOutput: true });
  });
  it("no-ops when no file_path is present", () => {
    const { stdout, status } = runHook("format-edit.mjs", {});
    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ suppressOutput: true });
  });
  it("does not crash on malformed JSON", () => {
    const { stdout, status } = runHookRaw("format-edit.mjs", "not-json{");
    expect(status).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ suppressOutput: true });
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm test tests/plugin/hooks.test.ts`
Expected: FAIL. The new dangerous patterns (`chmod -R`, `curl | sh`, `> /dev/sda`, `truncate`, `shred`, `git checkout -- .`, `find ... -delete`) are not yet detected, so those cases get empty output and the `JSON.parse` throws.

- [ ] **Step 3: Broaden `guard-bash.mjs`**

In `src/plugin/_sources/hooks/guard-bash.mjs`, replace the `rules` array with:

```js
const rules = [
  [/\brm\s+-\S*[rf]/, "recursive/forced rm"],
  [/\bgit\s+push\b[^\n]*(--force\b|\s-f\b)/, "git push --force"],
  [/\bgit\s+reset\s+--hard\b/, "git reset --hard"],
  [/\bgit\s+clean\s+-\S*f/, "git clean -f"],
  [/\bgit\s+checkout\s+(--\s+)?\.(?:\s|$)/, "git checkout . (discards uncommitted changes)"],
  [/:\s*\(\)\s*\{\s*:\s*\|\s*:/, "fork bomb"],
  [/\bdd\b[^\n]*\bof=/, "dd of= a device or file"],
  [/\bmkfs\b/, "mkfs"],
  [/\b(?:chmod|chown)\s+-\S*R/, "recursive chmod/chown"],
  [/\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/, "piping a download into a shell"],
  [/>\s*\/dev\/(?:sd|nvme|disk|hd|mmcblk|vd)/, "redirect to a raw disk device"],
  [/\btruncate\s+-s\s*0\b/, "truncate -s 0"],
  [/\bshred\b/, "shred"],
  [/\bfind\b[^\n]*\s-delete\b/, "find -delete"],
];
```

(Note: `> /dev/null` and `> /dev/stdout` are intentionally not matched, and `chmod 644 file` without `-R` is not matched, to avoid noise. The generic truncating `>` of an arbitrary file is deliberately not flagged for the same reason; raw-disk redirects and `truncate -s 0` cover the destructive intent.)

- [ ] **Step 4: Make `format-edit.mjs` control flow explicit (D4)**

In `src/plugin/_sources/hooks/format-edit.mjs`, change the three early-exit sites to `return done()`. Replace:

```js
let file = "";
try {
  file = JSON.parse(raw || "{}").tool_input?.file_path ?? "";
} catch {
  done();
}
if (!file || !EXT.has(extname(file).toLowerCase())) done();
```

with:

```js
let file = "";
try {
  file = JSON.parse(raw || "{}").tool_input?.file_path ?? "";
} catch {
  return done();
}
if (!file || !EXT.has(extname(file).toLowerCase())) return done();
```

And replace:

```js
if (!projectRoot) done();
```

with:

```js
if (!projectRoot) return done();
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm test tests/plugin/hooks.test.ts`
Expected: PASS (all dangerous, benign, and format-edit cases).

- [ ] **Step 6: Rebuild and verify the shipped hooks match**

Run: `pnpm build:plugin`
Expected: build succeeds.

Run: `git status --porcelain`
Expected: `src/plugin/_sources/hooks/guard-bash.mjs`, `src/plugin/_sources/hooks/format-edit.mjs`, `tests/plugin/hooks.test.ts`, plus the regenerated `plugin/hooks/guard-bash.mjs` and `plugin/hooks/format-edit.mjs`.

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/plugin/_sources/hooks/guard-bash.mjs src/plugin/_sources/hooks/format-edit.mjs tests/plugin/hooks.test.ts plugin/hooks/guard-bash.mjs plugin/hooks/format-edit.mjs
git commit -m "feat: broaden destructive-command guard and add hook contract tests"
```

---

## Task 5: CI drift guard (C3)

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the build and drift-check steps**

In `.github/workflows/ci.yml`, after the `pnpm install --frozen-lockfile` step and before `pnpm typecheck`, add two steps so the block reads:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm build:plugin
- run: git diff --exit-code
- run: pnpm typecheck
- run: pnpm lint
- run: pnpm test
```

- [ ] **Step 2: Prove the guard locally**

Run: `pnpm build:plugin && git diff --exit-code`
Expected: exit code 0 (no drift), because every prior task committed its regenerated `plugin/`.

Optional drift proof: append a space to a command source, run `pnpm build:plugin`, run `git diff --exit-code`, and confirm it exits non-zero. Then `git checkout -- src plugin` to revert.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: build the plugin and fail on source-to-artifact drift"
```

---

## Task 6: Reconcile the version to 1.3.0 (E1)

**Files:**

- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md` (status badge + roadmap)
- Modify: `SECURITY.md` (supported versions)

- [ ] **Step 1: Bump the package version**

In `package.json`, change `"version": "1.0.0"` to `"version": "1.3.0"`.

- [ ] **Step 2: Add a CHANGELOG entry**

In `CHANGELOG.md`, under `## [Unreleased]`, move its current items into a new section and leave `[Unreleased]` empty. Insert directly below the `## [Unreleased]` line:

```markdown
## [Unreleased]

## [1.3.0] - 2026-05-28

### Added

- GitHub Pages landing site (buildless static), deployed from `main`.
- Five bundled subagents (Claude Code): oracle, demiurge, inquisitor, arbiter, seer.
- Three automatic hooks (Claude Code): session-start context, a destructive-command guard, and format-on-edit.
- First hook contract tests and a site-data parity test.
- CI drift guard: `pnpm build:plugin && git diff --exit-code`.
- Clean human titles and categories for every bundled connector.

### Changed

- Renamed the nine slash commands to a deific lexicon: revelation, gospel, prophecy, genesis, summon, judgment, sanctify, exorcise, covenant.
- Broadened the destructive-command guard (recursive chmod/chown, piping downloads to a shell, raw-disk redirects, truncate, shred, find -delete, git checkout of the worktree).
- Reconciled the version to 1.3.0 across both manifests, the marketplace catalog, and the docs.
- Honest shipped-vs-roadmap framing in the README, package description, and SECURITY policy.

### Fixed

- `pnpm build` no longer references an uninstalled `vite`.
- Removed phantom `bin`, `dev`, and `doctor` entries that pointed at a non-existent CLI.
- The build test no longer mutates the committed `plugin/` tree (it builds into a temp dir).
- README quickstart now uses real command names.
- CONTRIBUTING points to the real source path and documents the build flow.
- The Codex manifest no longer advertises a Claude-style `mcpServers` pointer.
```

- [ ] **Step 3: Fix the README status badge**

In `README.md`, change the status badge line:

```markdown
[![Status](https://img.shields.io/badge/status-alpha-green.svg)](docs/specs/2026-05-27-godmode-design.md)
```

to:

```markdown
[![Version](https://img.shields.io/badge/version-1.3.0-7C3AED.svg)](CHANGELOG.md)
```

- [ ] **Step 4: Reframe the README roadmap**

In `README.md`, replace the roadmap version table (the block under `## Roadmap` that runs from the `| Version  | Milestone ...` header through the `| **v1.0** | Stable API ...` row) with a phase framing:

```markdown
| Phase     | What                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| **Now**   | Shipped in v1.3.0: 9 commands, 5 subagents, 3 hooks, 10 MCP servers, dual-engine, site      |
| **Next**  | Persistent hybrid memory: global + per-project SQLite, session injection                    |
| **Later** | Token economics (meter, optimizer, router, budgets); live dashboard; `godmode` CLI + doctor |
```

Also remove the `_(you are here)_` marker anywhere it appears in the README.

- [ ] **Step 5: Fix the SECURITY supported-versions table**

In `SECURITY.md`, replace:

```markdown
Godmode follows SemVer. During the `v0.x` series, only the current minor version receives security fixes. Once `v1.0` ships, the policy will be the current minor + previous minor.

| Version | Supported    |
| ------- | ------------ |
| v0.1.x  | ✅ (current) |
| < v0.1  | ❌           |
```

with:

```markdown
Godmode follows SemVer. The current minor and the previous minor receive security fixes.

| Version | Supported |
| ------- | --------- |
| 1.3.x   | yes       |
| < 1.3   | no        |
```

- [ ] **Step 6: Rebuild and verify a single version string**

Run: `pnpm build:plugin`
Expected: build succeeds.

Run: `grep -rh '"version"' package.json plugin/.claude-plugin/plugin.json plugin/.codex-plugin/plugin.json .claude-plugin/marketplace.json`
Expected: every line shows `1.3.0`.

Run: `grep -rn "you are here\|status-alpha\|v0.2" README.md SECURITY.md || echo "clean"`
Expected: `clean`.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json CHANGELOG.md README.md SECURITY.md plugin/.claude-plugin/plugin.json plugin/.codex-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: reconcile version to 1.3.0 across manifests and docs"
```

---

## Task 7: Docs accuracy (B1, B2, B3, B4, B5, B6)

**Files:**

- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `src/plugin/_sources/README.md`
- Modify: `src/plugin/_sources/manifest.ts`
- Modify: `package.json`

When editing any sentence in this task, write it with no em dashes.

- [ ] **Step 1: B1 + B3 + B2 in the README install/verify area**

Find and replace the stale post-install line (around `README.md:95`):

```markdown
`/learn`, `/review`, `/debug`, and the rest appear in your slash-command menu; the bundled MCP servers load automatically from the plugin's `.mcp.json`. No separate MCP setup needed on Claude Code.
```

with:

```markdown
`/revelation`, `/judgment`, `/exorcise`, and the rest appear in your slash-command menu; the bundled MCP servers load automatically from the plugin's `.mcp.json`. No separate MCP setup needed on Claude Code.
```

Replace the publish hedge (around `README.md:83`):

```markdown
> The GitHub paths below assume the repo is published at `github.com/patrickking67/godmode`. Until then — or for local development — use the **local clone** variant in each section.
```

with:

```markdown
> Godmode is public at `github.com/patrickking67/godmode`, so the marketplace paths below work as written. For local development, use the **local clone** variant in each section.
```

Replace the Verify prose with the corrected command name and a first-command block (the lines around `README.md:133-137`, starting at `In Claude Code, open` through `run /learn to confirm the workflows loaded.`):

````markdown
In Claude Code, open `/plugin` to confirm **godmode** is installed and its commands are listed. In a fresh session of either engine, run `/revelation` to confirm the workflows loaded.

### Your first command

Godmode surfaces its full command list as context at the start of every session, so you can always ask "what can Godmode do here?" To dive in, point it at the current repo:

```text
/revelation this codebase and tell me how it fits together
```
````

````

- [ ] **Step 2: B4 in CONTRIBUTING**

In `CONTRIBUTING.md`, replace the dead source-path bullet (line 20):

```markdown
- **Add a skill** — author it as a `SKILL.md` under `src/plugin/_sources/skills/<pillar>/<name>/`. Build script emits Claude + Codex variants automatically.
````

with:

```markdown
- **Add a command** by creating `src/plugin/_sources/commands/<name>.md` (front-matter plus a Markdown body). The build emits a Claude slash command and a shared Codex skill from that one file.
```

Replace the test-mandate line (line 26):

```markdown
3. **Tests required** for `src/core/` and `src/server/` changes. UI changes get React Testing Library component tests. `pnpm test` must pass.
```

with:

```markdown
3. **Tests required** when you change behavior in `scripts/` or `src/plugin/_sources/` (for example the emitter or a hook). `pnpm test` must pass.
```

Add a "Source of truth and build" section immediately after the `## Quick start` block:

```markdown
## Source of truth and build

Everything ships from `src/plugin/_sources/`. The committed `plugin/` directory is generated: never hand-edit it. After changing a source file, run `pnpm build:plugin` and commit the regenerated `plugin/` in the same commit. CI fails if `plugin/` drifts from its sources.
```

- [ ] **Step 3: B6 in SECURITY (shipped vs roadmap + contact)**

In `SECURITY.md`, replace the contact line:

```markdown
Email: `security@<owner-domain>` (replace once domain is set).
Alternatively, use [GitHub Security Advisories](https://github.com/patrickking67/godmode/security/advisories/new) for private disclosure.
```

with:

```markdown
Use [GitHub Security Advisories](https://github.com/patrickking67/godmode/security/advisories/new) for private disclosure.
```

Add a note at the top of the `## Security model` section (immediately after the heading):

```markdown
> Scope note: the shipped plugin (commands, agents, hooks, MCP wiring) runs no server and stores no data. The local server, hybrid memory, and dashboard described below are on the roadmap; their security model is documented here ahead of implementation.
```

- [ ] **Step 4: B5 in the authoring template**

In `src/plugin/_sources/README.md`, in the command-format example, change `name: learn` to `name: revelation`.

- [ ] **Step 5: B6 honesty in the descriptions**

In `src/plugin/_sources/manifest.ts`, replace the `description` value:

```ts
  description:
    "Learn, plan, build, and optimize — one super-plugin for Claude Code and Codex, with hero workflows and bundled documentation MCPs.",
```

with:

```ts
  description:
    "Learn, plan, build, and optimize: one super-plugin for Claude Code and Codex, with hero workflows and bundled no-auth MCP servers.",
```

In `package.json`, replace the `description` field:

```json
  "description": "Learn, plan, build, and optimize — one super-plugin for agentic coding tools, with persistent memory, token economics, bundled MCPs, and a live local webviewer.",
```

with:

```json
  "description": "Learn, plan, build, and optimize: one dual-engine super-plugin for Claude Code and Codex with hero workflows, bundled subagents and hooks, and ten no-auth MCP servers. Persistent memory, token economics, and a live dashboard are on the roadmap.",
```

- [ ] **Step 6: Rebuild and verify**

Run: `pnpm build:plugin`
Expected: build succeeds (the manifest description change regenerates the manifests and marketplace catalog).

Run: `grep -rn "/learn\b\|/review\b\|/debug\b\|may not be published\|skills/<pillar>" README.md CONTRIBUTING.md || echo "clean"`
Expected: `clean`.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

Run: `git status --porcelain`
Expected: the edited docs plus regenerated `plugin/.claude-plugin/plugin.json`, `plugin/.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`.

- [ ] **Step 7: Commit**

```bash
git add README.md CONTRIBUTING.md SECURITY.md src/plugin/_sources/README.md src/plugin/_sources/manifest.ts package.json plugin/.claude-plugin/plugin.json plugin/.codex-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "docs: correct command names, paths, and shipped-vs-roadmap claims"
```

---

## Task 8: Canonical site data and the buildless landing page (A1, A2)

**Files:**

- Create: `site/data/godmode.json`
- Create: `site/index.html`
- Create: `site/styles.css`
- Create: `site/main.js`
- Create: `site/.nojekyll`
- Create: `site/assets/` (favicon and OG image, authored during this task)

- [ ] **Step 1: Author the canonical data file**

Create `site/data/godmode.json` with exactly this content (titles and categories match `src/plugin/_sources/mcps.ts` from Task 3):

```json
{
  "tagline": "Learn. Plan. Build. Optimize.",
  "pitch": "One plugin for Claude Code and Codex. Battle-tested workflows and ten bundled no-auth MCP servers, installed once from a single source in both engines.",
  "commands": [
    {
      "name": "revelation",
      "pillar": "Learning",
      "purpose": "Deeply explore a codebase and explain how it fits together."
    },
    { "name": "gospel", "pillar": "Learning", "purpose": "Explain how a piece of code works." },
    {
      "name": "prophecy",
      "pillar": "Guiding",
      "purpose": "How-to guidance grounded in this codebase."
    },
    {
      "name": "genesis",
      "pillar": "Building",
      "purpose": "Implement a well-scoped feature or fix."
    },
    {
      "name": "summon",
      "pillar": "Building",
      "purpose": "Dispatch the right subagent for a task."
    },
    {
      "name": "judgment",
      "pillar": "Reviewing",
      "purpose": "Review code for bugs, security, and drift."
    },
    {
      "name": "sanctify",
      "pillar": "Reviewing",
      "purpose": "Run the project's own checks and report pass or fail."
    },
    {
      "name": "exorcise",
      "pillar": "Debugging",
      "purpose": "Find the true root cause of a bug or failing test."
    },
    { "name": "covenant", "pillar": "Git", "purpose": "Commit your work cleanly." }
  ],
  "agents": [
    {
      "name": "oracle",
      "role": "Read-only codebase reconnaissance: maps structure, traces flows."
    },
    { "name": "demiurge", "role": "Implements a well-scoped feature or fix end to end." },
    {
      "name": "inquisitor",
      "role": "Rigorous code review: bugs, security, silent failures, drift."
    },
    { "name": "arbiter", "role": "Runs the project's own checks and reports pass or fail." },
    { "name": "seer", "role": "Roots out the true cause of a bug or failing test." }
  ],
  "hooks": [
    {
      "name": "Session invocation",
      "event": "SessionStart",
      "detail": "Surfaces the command and subagent surface as context."
    },
    {
      "name": "Forbidden-act guard",
      "event": "PreToolUse",
      "detail": "Asks for confirmation before destructive Bash commands. Warns and confirms, never hard-blocks."
    },
    {
      "name": "Auto-sanctify edits",
      "event": "PostToolUse",
      "detail": "Runs prettier on the changed file, but only when the project already uses prettier."
    }
  ],
  "connectors": [
    {
      "slug": "context7",
      "title": "Context7",
      "category": "Docs",
      "blurb": "Up-to-date, version-aware docs for libraries, frameworks, SDKs, and CLIs."
    },
    {
      "slug": "microsoft-learn",
      "title": "Microsoft Learn",
      "category": "Docs",
      "blurb": "Search and fetch Microsoft and Azure documentation and code samples."
    },
    {
      "slug": "aws-knowledge",
      "title": "AWS Knowledge",
      "category": "Docs",
      "blurb": "AWS documentation, code samples, and regional availability."
    },
    {
      "slug": "cloudflare-docs",
      "title": "Cloudflare Docs",
      "category": "Docs",
      "blurb": "Search the Cloudflare developer platform documentation."
    },
    {
      "slug": "keeper-docs",
      "title": "Keeper Docs",
      "category": "Docs",
      "blurb": "Search Keeper Security documentation."
    },
    {
      "slug": "deepwiki",
      "title": "DeepWiki",
      "category": "Code intelligence",
      "blurb": "Ask questions about any public GitHub repo's architecture and docs."
    },
    {
      "slug": "grep",
      "title": "grep.app",
      "category": "Code intelligence",
      "blurb": "Regex code search across a million public GitHub repositories."
    },
    {
      "slug": "playwright",
      "title": "Playwright",
      "category": "Browser",
      "blurb": "Drive a real browser for testing, screenshots, and verification."
    },
    {
      "slug": "chrome-devtools",
      "title": "Chrome DevTools",
      "category": "Browser",
      "blurb": "Inspect the DOM, network, console, and performance traces in Chrome."
    },
    {
      "slug": "azure",
      "title": "Azure",
      "category": "Cloud",
      "blurb": "Manage Azure resources and deployments using your local az login."
    }
  ],
  "roadmap": [
    {
      "phase": "Now",
      "label": "Shipped in v1.3.0",
      "items": [
        "9 deific commands",
        "5 subagents and 3 hooks (Claude Code)",
        "10 bundled no-auth MCP servers",
        "Dual-engine, one source"
      ]
    },
    {
      "phase": "Next",
      "items": ["Persistent hybrid memory: global and per-project SQLite, session injection"]
    },
    {
      "phase": "Later",
      "items": [
        "Token economics: meter, optimizer, router, budgets",
        "Live local dashboard",
        "godmode CLI and doctor"
      ]
    }
  ]
}
```

- [ ] **Step 2: Create the no-Jekyll marker**

Create an empty file `site/.nojekyll` (zero bytes).

- [ ] **Step 3: Build the page with the frontend-design skill**

Invoke the `frontend-design` skill and generate `site/index.html`, `site/styles.css`, `site/main.js`, and the `site/assets/` favicon and OG image to this brief. Use the connectors (Context7 for current HTML/CSS and Open Graph guidance, DeepWiki or grep.app for strong landing-page references) rather than defaulting to a stock layout.

Brand tokens (CSS custom properties): background `#0a0a0f` and `#12121a`; panels `#16161f` and `#1c1c28`; primary `#7C3AED`; primary-2 `#a855f7`; accent `#10B981`; text `#ececf1`; muted `#9a9ab0`; code background `#0d0d14`; radius `16px`; max width `1080px`. Prose font: a system sans stack. Code font: a mono stack including JetBrains Mono. Motif: the fire mark and the line "Learn. Plan. Build. Optimize."

Sections, in order:

1. Sticky, blurred nav: brand mark plus anchor links Why, Commands, Connectors, Install, GitHub. Collapses cleanly on mobile.
2. Hero: the tagline as the headline, the `pitch` as the subhead, two dual-engine badges (Claude Code, Codex), a primary button to the Install section and a secondary button to the GitHub repo, and an animated mock of a slash-command menu built in HTML/CSS/JS (no screenshot).
3. Why Godmode: the problem-to-answer pairs from the README, as designed cards.
4. Commands: render from `data.commands`, grouped by `pillar` in this order (Learning, Guiding, Building, Reviewing, Debugging, Git), each card showing the command name in mono and its purpose.
5. Subagents and hooks: render from `data.agents` and `data.hooks`, labeled Claude Code only.
6. Connectors: render from `data.connectors`, grouped by `category` (Docs, Code intelligence, Browser, Cloud), each showing the clean `title`, the category, and the `blurb`.
7. Install: two tabs (Claude Code, Codex). Each tab has copy-to-clipboard code blocks whose contents match the README install commands exactly.
8. Roadmap: render from `data.roadmap` as Now, Next, Later.
9. Footer: Apache-2.0, repo link, security link.

Behavior and quality requirements:

- `main.js` fetches `./data/godmode.json` and renders the Commands, Subagents and hooks, Connectors, and Roadmap sections. Provide minimal static fallback text inside those containers for the no-JS case.
- All asset references are relative (`./styles.css`, `./main.js`, `./data/godmode.json`, `./assets/...`) so the site works under the `/godmode/` base. No leading-slash absolute paths.
- Accessibility: semantic landmarks (`header`, `nav`, `main`, `section`, `footer`), keyboard-operable nav, install tabs, and copy buttons; visible focus rings; color contrast AA or better; honor `prefers-reduced-motion`; meaningful `alt` text; the install tabs use proper ARIA `tablist`/`tab`/`tabpanel` roles.
- Performance: no external web fonts and no CDN scripts; inline the favicon as an SVG; keep motion to lightweight transforms revealed with `IntersectionObserver`.
- Social: `<meta>` Open Graph and Twitter card tags, `og:url` set to `https://patrickking67.github.io/godmode/`, `og:image` pointing at `./assets/og-image` (an asset you create). Set `theme-color` to `#7C3AED`.
- No em dashes anywhere in the copy.

- [ ] **Step 4: Serve and verify in a real browser (connector-backed)**

Start a static server: `npx --yes serve site -l 4173` (or `python3 -m http.server 4173 --directory site`).

Using the Playwright or Chrome DevTools connector, load `http://localhost:4173/`:

- Take a full-page desktop screenshot (width 1280) and a mobile screenshot (width 390).
- Confirm the Commands, Connectors, Subagents, and Roadmap sections rendered from the JSON (the page is not empty where JS injects content).
- Click each install tab and confirm the panel switches; click a copy button and confirm it reports copied.
- Tab through the nav and the install tabs with the keyboard and confirm focus is visible and order is sane.
- Confirm the browser console has no errors and no failed `data/godmode.json` request.

Stop the server when done.

- [ ] **Step 5: Commit**

```bash
git add site
git commit -m "feat: add the Godmode landing site (buildless static, data-driven)"
```

---

## Task 9: Site-data parity test and the Pages deploy workflow (A3, A4)

**Files:**

- Create: `tests/site/site-data.test.ts`
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Write the parity test**

Create `tests/site/site-data.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the parity test**

Run: `pnpm test tests/site/site-data.test.ts`
Expected: PASS. If it fails, the site data and `mcps.ts` disagree; fix `site/data/godmode.json` to match (do not weaken the test).

- [ ] **Step 3: Create the Pages workflow**

Create `.github/workflows/pages.yml`:

```yaml
name: Deploy site to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - "site/**"
      - ".github/workflows/pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

Before committing, confirm via a connector (Context7 or the GitHub Actions docs) that `configure-pages@v5`, `upload-pages-artifact@v3`, and `deploy-pages@v4` are still the current major versions; bump if a newer major is current.

- [ ] **Step 4: Verify**

Run: `pnpm test`
Expected: all suites pass, including `tests/site/site-data.test.ts`.

Run a YAML sanity check (optional): `npx --yes js-yaml .github/workflows/pages.yml > /dev/null && echo ok`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add tests/site/site-data.test.ts .github/workflows/pages.yml
git commit -m "feat: site-data parity test and GitHub Pages deploy workflow"
```

---

## Task 10: Repo-wide em-dash sweep and gate

**Files:**

- Modify (as needed): any authored content still containing an em dash.

- [ ] **Step 1: Find remaining em dashes in authored content**

Run:

```bash
grep -rn "$(printf '\342\200\224')" \
  README.md CONTRIBUTING.md SECURITY.md CHANGELOG.md NOTICE \
  src/plugin/_sources \
  package.json \
  site \
  || echo "none"
```

(Do not touch `LICENSE`, the dated `docs/specs/2026-05-27-*` and `docs/plans/2026-05-27-*` historical artifacts, `pnpm-lock.yaml`, or the generated `plugin/` tree directly.)

- [ ] **Step 2: Replace each occurrence**

For every hit, rewrite the line without the em dash: use a colon when the dash introduces an explanation, a comma or parentheses for an aside, "to" for a numeric range, or split into two sentences. Edit the source (`src/plugin/_sources/...`), never the generated `plugin/` copy.

- [ ] **Step 3: Rebuild if any source under `_sources/` changed**

Run: `pnpm build:plugin`
Expected: build succeeds. This propagates any command, agent, or description edits into `plugin/`.

- [ ] **Step 4: Gate on zero em dashes**

Run:

```bash
grep -rn "$(printf '\342\200\224')" README.md CONTRIBUTING.md SECURITY.md CHANGELOG.md NOTICE src/plugin/_sources package.json site && echo "FAIL: em dashes remain" || echo "PASS: no em dashes"
```

Expected: `PASS: no em dashes`.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: remove em dashes from authored content"
```

(If Step 1 reported `none` and nothing changed, skip the commit.)

---

## Task 11: Final verification and gated deployment handoff (A5)

**Files:** none (verification and a handoff message).

- [ ] **Step 1: Full suite and clean tree**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all pass; the build prints `9 commands, 9 skills, 5 agents, 3 hooks, 10 MCP servers`.

Run: `pnpm build:plugin && git diff --exit-code`
Expected: exit 0 (no drift).

- [ ] **Step 2: Site smoke check**

Serve `site/` and load it once more in the Playwright or Chrome DevTools connector; confirm no console errors and that all data-driven sections render. Capture a final desktop screenshot for the handoff.

- [ ] **Step 3: Present the gated deployment steps (do NOT execute without explicit owner approval)**

Report to the owner that the following outward-facing steps remain and require their go-ahead:

1. Merge this branch to `main` (triggers nothing destructive; the Pages workflow runs only after Pages is enabled).
2. Enable GitHub Pages with the GitHub Actions source:

   ```bash
   gh api -X POST repos/patrickking67/godmode/pages -f build_type=workflow || \
   gh api -X PUT repos/patrickking67/godmode/pages -f build_type=workflow
   ```

3. Set the repo homepage to the Pages URL:

   ```bash
   gh repo edit patrickking67/godmode --homepage "https://patrickking67.github.io/godmode/"
   ```

4. After the first successful Pages deploy, optionally re-point the README status badge link target away from the old design spec (deferred Low item).

Do not run these without the owner saying so. Implementation is complete on the branch regardless.

---

## Self-review (completed by the plan author)

- **Spec coverage:** A1 (Task 8), A2 (Task 8 data + Task 3 titles), A3 (Task 9), A4 (Task 9), A5 (Task 11 gated). B1-B6 (Task 7). C1-C2 (Task 1), C3 (Task 5), C4-C5 (Task 3). D1 (Task 2), D2-D4 (Task 4). E1 (Task 6). Connector usage and the no-em-dash rule are in the per-task conventions and enforced by Task 10. Every spec item maps to a task.
- **Placeholder scan:** no TBD or "handle edge cases" steps; code and commands are concrete. The site HTML/CSS/JS is generated by the frontend-design skill from a complete brief plus a complete data file, then verified in a browser, which is the correct granularity for the creative deliverable.
- **Type and name consistency:** `build(opts: BuildOptions)` is defined in Task 2 and used (with `outDir`/`marketplaceDir`) in Task 2's test; `McpServerDef` gains `title`/`category` in Task 3 and is read by the Task 9 test and the Task 8 data; connector titles and categories are identical across Task 3, the Task 8 JSON, and the Task 9 assertions.

```

```
