#!/usr/bin/env node
// Godmode PreToolUse guard: prompt for confirmation before destructive Bash commands.
// Emits permissionDecision "ask" (a warn-and-confirm gate) on a match; otherwise stays
// out of the way. Never hard-blocks; the user keeps the final say.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let command = "";
  try {
    command = JSON.parse(raw || "{}").tool_input?.command ?? "";
  } catch {
    process.exit(0); // unparseable input; don't interfere
  }

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

  for (const [re, label] of rules) {
    if (re.test(command)) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: `Godmode guard: "${label}" is destructive; confirm before running.`,
          },
        }),
      );
      process.exit(0);
    }
  }
  process.exit(0);
});
