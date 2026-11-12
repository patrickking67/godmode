#!/usr/bin/env node
/**
 * Keeps the published test count true. `pnpm check` runs vitest with a JSON report and
 * then this script, which fails if the number in the README badge, the README table or
 * the site differs from the number of tests that just ran and passed.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");

let report;
try {
  report = JSON.parse(read("coverage", "test-results.json"));
} catch {
  console.error("check-claims: no coverage/test-results.json. Run `pnpm check`, not this alone.");
  process.exit(1);
}

const total = report.numTotalTests;
if (report.numPassedTests !== total) {
  console.error(`check-claims: ${total - report.numPassedTests} of ${total} tests did not pass.`);
  process.exit(1);
}

const places = [
  ["README.md badge", read("README.md"), /badge\/tests-(\d+)%20passing/],
  ["README.md quality table", read("README.md"), /\| Tests\s*\|\s*(\d+) /],
  ["site/index.html", read("site", "index.html"), /<span id="test-count">(\d+)<\/span>/],
  ["site demo transcript", read("site", "index.html"), /Tests {2}(\d+) passed/],
];

let wrong = 0;
for (const [label, text, pattern] of places) {
  const said = text.match(pattern)?.[1];
  if (said === String(total)) continue;
  wrong++;
  console.error(`check-claims: ${label} says ${said ?? "nothing"}, but ${total} tests ran.`);
}
if (wrong) {
  console.error(`Update the number to ${total} in the places above.`);
  process.exit(1);
}
console.log(`check-claims: ${total} tests, and every published count agrees.`);
