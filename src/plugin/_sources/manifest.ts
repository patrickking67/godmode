/**
 * Single source of truth for plugin identity.
 *
 * The build emitter (`scripts/build-plugin.ts`) reads this and produces the
 * Claude Code manifest (`.claude-plugin/plugin.json`), the Codex manifest
 * (`.codex-plugin/plugin.json`), and the Claude marketplace catalog. `version`
 * is intentionally absent here — the emitter injects it from `package.json` so
 * the package and both plugin manifests can never drift.
 */

/** Codex `interface` block — controls how the plugin presents in the Codex UI. */
export interface CodexInterface {
  displayName: string;
  shortDescription: string;
  longDescription: string;
  developerName: string;
  category: string;
  capabilities: string[];
  defaultPrompt: string[];
  brandColor: string;
  websiteURL: string;
}

export interface ManifestSource {
  /** Stable kebab-case install identifier (lowercase). Distinct from the npm package display name. */
  name: string;
  description: string;
  author: { name: string; url?: string };
  homepage: string;
  repository: { type: "git"; url: string };
  license: string;
  keywords: string[];
  interface: CodexInterface;
}

export const MANIFEST: ManifestSource = {
  name: "godmode",
  description:
    "Learn, plan, build, and optimize — one super-plugin for Claude Code and Codex, with hero workflows and bundled documentation MCPs.",
  author: { name: "Patrick King", url: "https://github.com/patrickking67" },
  homepage: "https://github.com/patrickking67/godmode#readme",
  repository: { type: "git", url: "git+https://github.com/patrickking67/godmode.git" },
  license: "Apache-2.0",
  keywords: ["claude-code", "codex", "plugin", "workflows", "mcp", "subagents"],
  interface: {
    displayName: "Godmode",
    shortDescription: "Hero workflows + bundled docs MCPs for agentic coding.",
    longDescription:
      "Godmode bundles battle-tested coding workflows (learn, explain, debug, implement, review, verify, commit) and five documentation MCP servers (Context7, Microsoft Learn, Cloudflare Docs, Keeper Docs, Playwright) into a single install that works in both Claude Code and Codex.",
    developerName: "Patrick King",
    category: "Developer Tools",
    capabilities: ["Read", "Write", "Edit", "Bash", "WebFetch"],
    defaultPrompt: [
      "/learn this codebase and tell me how it fits together",
      "/review my uncommitted changes",
      "/debug the failing test in this file",
    ],
    brandColor: "#7C3AED",
    websiteURL: "https://github.com/patrickking67/godmode",
  },
};
