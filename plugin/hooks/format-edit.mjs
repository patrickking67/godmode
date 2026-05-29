#!/usr/bin/env node
// Godmode PostToolUse hook: prettier --write the edited file, but ONLY when the project
// actually uses prettier (a config is present) and prettier is already installed locally.
// In any other repo it is a silent no-op — it never reformats unexpectedly or auto-installs.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, parse } from "node:path";

const EXT = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts",
  ".json", ".jsonc", ".css", ".scss", ".less", ".html", ".vue",
  ".md", ".mdx", ".yaml", ".yml", ".graphql",
]);
const CONFIG_FILES = [
  ".prettierrc", ".prettierrc.json", ".prettierrc.json5", ".prettierrc.yaml",
  ".prettierrc.yml", ".prettierrc.toml", ".prettierrc.js", ".prettierrc.cjs",
  ".prettierrc.mjs", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs",
];

function done() {
  process.stdout.write(JSON.stringify({ suppressOutput: true }));
  process.exit(0);
}

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let file = "";
  try {
    file = JSON.parse(raw || "{}").tool_input?.file_path ?? "";
  } catch {
    return done();
  }
  if (!file || !EXT.has(extname(file).toLowerCase())) return done();

  // Walk up from the edited file for a prettier config; that directory is the project root.
  let dir = dirname(file);
  const fsRoot = parse(dir).root;
  let projectRoot = null;
  for (;;) {
    if (CONFIG_FILES.some((c) => existsSync(join(dir, c)))) {
      projectRoot = dir;
      break;
    }
    const pkg = join(dir, "package.json");
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, "utf8")).prettier !== undefined) {
          projectRoot = dir;
          break;
        }
      } catch {
        /* malformed package.json — keep walking */
      }
    }
    if (dir === fsRoot) break;
    dir = dirname(dir);
  }
  if (!projectRoot) return done();

  try {
    // --no-install: run only if prettier is already a local/available binary; never fetch it.
    execFileSync("npx", ["--no-install", "prettier", "--write", file], {
      cwd: projectRoot,
      stdio: "ignore",
      timeout: 20000,
    });
  } catch {
    /* prettier absent or errored — leave the file exactly as written */
  }
  done();
});
