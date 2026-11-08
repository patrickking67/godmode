#!/usr/bin/env node
// Godmode SessionStart hook: surface the command + agent surface as session context.
// Reads (and ignores) stdin so the hook runner never blocks on the input pipe.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  // Claude Code namespaces plugin skills, so each workflow runs as /godmode:<name>.
  const additionalContext = [
    "Godmode is active. Workflow skills (run as /godmode:<name>):",
    "/godmode:revelation explore a codebase · /godmode:gospel explain code ·",
    "/godmode:prophecy how-to guidance · /godmode:genesis implement ·",
    "/godmode:summon dispatch subagents · /godmode:judgment review ·",
    "/godmode:sanctify run checks · /godmode:exorcise debug root cause · /godmode:covenant commit.",
    "Bundled subagents (via /godmode:summon or Task): oracle, demiurge, inquisitor, arbiter, seer.",
  ].join("\n");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
    }),
  );
  process.exit(0);
});
