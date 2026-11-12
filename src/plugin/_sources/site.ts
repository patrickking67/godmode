/**
 * Copy for the landing site that does not come from a workflow, agent or server
 * definition. The build merges it with those definitions into `site/data/godmode.json`.
 */

export interface SiteHook {
  name: string;
  event: "SessionStart" | "PreToolUse" | "PostToolUse";
  script: string;
  detail: string;
}

export interface SiteRoadmapPhase {
  phase: "Now" | "Next" | "Later";
  label?: string;
  items: string[];
}

export const SITE = {
  tagline: "Learn. Plan. Build. Optimize.",
  pitch:
    "One plugin for Claude Code and Codex. Nine coding workflows and ten no-auth MCP servers, authored once and built for both engines.",
  /** Display order of the workflow groups. Every workflow's `pillar` must be one of these. */
  pillars: ["Learn", "Plan", "Build", "Review", "Debug", "Ship"],
  hooks: [
    {
      name: "Session context",
      event: "SessionStart",
      script: "session-start.mjs",
      detail: "Adds a short list of the workflows and subagents to the session context.",
    },
    {
      name: "Destructive command guard",
      event: "PreToolUse",
      script: "guard-bash.mjs",
      detail:
        "Asks for confirmation before destructive shell commands such as rm -rf or git push --force. It asks; it never blocks.",
    },
    {
      name: "Format on edit",
      event: "PostToolUse",
      script: "format-edit.mjs",
      detail:
        "Runs prettier on the edited file, only when the project already has a prettier config and prettier installed.",
    },
  ] satisfies SiteHook[],
  roadmap: [
    {
      phase: "Now",
      label: "Shipped",
      items: [
        "9 workflow skills, both engines",
        "5 subagents and 3 hooks (Claude Code)",
        "10 bundled no-auth MCP servers",
        "One source, one build, drift-checked in CI",
      ],
    },
    {
      phase: "Next",
      items: ["Persistent memory: global and per-project, injected at session start"],
    },
    {
      phase: "Later",
      items: ["Token and cost tracking", "A local dashboard", "A godmode CLI with a doctor command"],
    },
  ] satisfies SiteRoadmapPhase[],
};
