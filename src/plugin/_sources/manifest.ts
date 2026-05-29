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
  /** Claude's plugin schema requires `repository` to be a plain URL string, not an npm-style object. */
  repository: string;
  license: string;
  keywords: string[];
  interface: CodexInterface;
}

export const MANIFEST: ManifestSource = {
  name: "godmode",
  description:
    "Learn, plan, build, and optimize: one super-plugin for Claude Code and Codex, with hero workflows and bundled no-auth MCP servers.",
  author: { name: "Patrick King", url: "https://github.com/patrickking67" },
  homepage: "https://github.com/patrickking67/godmode#readme",
  repository: "https://github.com/patrickking67/godmode",
  license: "Apache-2.0",
  keywords: ["claude-code", "codex", "plugin", "workflows", "mcp", "subagents"],
  interface: {
    displayName: "Godmode",
    shortDescription: "Deific coding workflows + bundled no-auth MCP servers.",
    longDescription:
      "Godmode bundles battle-tested coding workflows — revelation, gospel, prophecy, genesis, summon, judgment, sanctify, exorcise, covenant — and ten no-auth MCP servers across docs (Context7, Microsoft Learn, AWS Knowledge, Cloudflare Docs, Keeper Docs), code intelligence (DeepWiki, grep.app), browser automation (Playwright, Chrome DevTools), and cloud (Azure). In Claude Code it also ships five themed subagents (oracle, demiurge, inquisitor, arbiter, seer) and automatic hooks. One install, both engines.",
    developerName: "Patrick King",
    category: "Developer Tools",
    capabilities: ["Read", "Write", "Edit", "Bash", "WebFetch"],
    defaultPrompt: [
      "/revelation this codebase and tell me how it fits together",
      "/judgment my uncommitted changes",
      "/exorcise the failing test in this file",
    ],
    brandColor: "#7C3AED",
    websiteURL: "https://github.com/patrickking67/godmode",
  },
};
