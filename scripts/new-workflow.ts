/**
 * Scaffold a new workflow source.
 *
 * Usage: pnpm new:workflow <name> "<description>" [pillar]
 *
 * Writes `src/plugin/_sources/commands/<name>.md` with the four required sections and a
 * numbered procedure, then prints what to do next. It never overwrites an existing file
 * and applies the same name and description rules the skill lint enforces, so a scaffold
 * that is accepted here is one the tests will accept once the TODO text is replaced.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SAFE_NAME } from "./build-plugin.js";
import { SITE } from "../src/plugin/_sources/site.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMMANDS = join(ROOT, "src", "plugin", "_sources", "commands");

export interface ScaffoldInput {
  name: string;
  description: string;
  pillar?: string;
}

/** Return every problem with the input, or an empty list when it is acceptable. */
export function validateScaffold(input: ScaffoldInput, existing: string[] = []): string[] {
  const problems: string[] = [];
  const { name, description, pillar = "Build" } = input;
  if (!SAFE_NAME.test(name)) problems.push(`name "${name}" must be kebab-case (a-z, 0-9, dashes)`);
  if (existing.includes(name)) problems.push(`a workflow named "${name}" already exists`);
  if (!SITE.pillars.includes(pillar)) {
    problems.push(`pillar "${pillar}" must be one of ${SITE.pillars.join(", ")}`);
  }
  if (description.length < 80 || description.length > 320) {
    problems.push("description must be 80 to 320 characters");
  }
  if (!/^[A-Z][a-z]+ /.test(description)) problems.push("description must start with a verb");
  if (!/\bUse (only )?when\b/.test(description))
    problems.push('description must say "Use when ..."');
  if (!description.endsWith(".")) problems.push("description must end with a period");
  if (description.includes("—")) problems.push("description must not contain an em dash");
  if ((description.split(". ")[0] ?? "").length > 200) {
    problems.push("the first sentence of the description must be 200 characters or fewer");
  }
  return problems;
}

/** The Markdown source for a new workflow. The TODO lines are meant to be replaced. */
export function renderWorkflow({ name, description, pillar = "Build" }: ScaffoldInput): string {
  return `---
name: ${name}
description: ${description}
allowed-tools: Read, Grep, Glob
pillar: ${pillar}
engines: both
---

TODO: one or two sentences on what this workflow does and what it does not do.

## When to use

- TODO: the request that should start this workflow, in the user's words.
- TODO: when to use a different workflow instead, naming it in backticks.

## Procedure

### 1. Gather context

TODO: say what to read or run first, and never invent a command the repository does not define.

### 2. Do the work

TODO: the core steps, in order, with the exact commands or files to touch where they are known.

### 3. Report

TODO: what to tell the user: the result, what was not verified, and the next action to take.

## Stop conditions

- TODO: the cases where the workflow stops and asks instead of continuing, such as a missing input.

## Verify

TODO: how to confirm the work is done, using a command or a check the user can see run.
`;
}

/** Write the scaffold and return its path. Throws with every problem if the input is invalid. */
export function scaffoldWorkflow(input: ScaffoldInput, dir: string = COMMANDS): string {
  const existing = readdirSync(dir).map((f) => f.replace(/\.md$/, ""));
  const problems = validateScaffold(input, existing);
  if (problems.length > 0) throw new Error(problems.map((p) => `- ${p}`).join("\n"));
  const path = join(dir, `${input.name}.md`);
  if (existsSync(path)) throw new Error(`${path} already exists`);
  writeFileSync(path, renderWorkflow(input));
  return path;
}

function main(argv: string[]): number {
  const [name, description, pillar] = argv;
  if (!name || !description) {
    console.error('Usage: pnpm new:workflow <name> "<description>" [pillar]');
    console.error(`Pillars: ${SITE.pillars.join(", ")} (default Build)`);
    return 2;
  }
  try {
    const path = scaffoldWorkflow({ name, description, pillar });
    console.log(`Created ${path}`);
    console.log(
      "Next: replace every TODO, run pnpm build:plugin, update the README, docs and site",
    );
    console.log("counts and tables that name the workflows, then run pnpm check.");
    return 0;
  } catch (error) {
    console.error(`Cannot create the workflow:\n${(error as Error).message}`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
