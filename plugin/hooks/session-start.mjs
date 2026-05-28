#!/usr/bin/env node
// Godmode SessionStart hook: surface the command + agent surface as session context.
// Reads (and ignores) stdin so the hook runner never blocks on the input pipe.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const additionalContext = [
    "Godmode is active. Deific slash commands:",
    "/revelation explore a codebase · /gospel explain code · /prophecy how-to guidance ·",
    "/genesis implement · /summon dispatch subagents · /judgment review · /sanctify run checks ·",
    "/exorcise debug root cause · /covenant commit.",
    "Bundled subagents (via /summon or Task): oracle, demiurge, inquisitor, arbiter, seer.",
  ].join("\n");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
    }),
  );
  process.exit(0);
});
