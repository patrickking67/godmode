import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../scripts/build-plugin.js";
import { renderWorkflow, scaffoldWorkflow, validateScaffold } from "../../scripts/new-workflow.js";

const DESCRIPTION =
  "Summarize the open TODO comments in a repository by owner and age. Use when the user asks what work is still outstanding in the code.";

describe("new-workflow scaffold", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "godmode-scaffold-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("accepts a valid name, description and pillar", () => {
    expect(validateScaffold({ name: "todo-sweep", description: DESCRIPTION })).toEqual([]);
  });

  it("rejects unsafe names, unknown pillars and weak descriptions", () => {
    const problems = validateScaffold({
      name: "../Evil",
      description: "Too short.",
      pillar: "Nope",
    });
    expect(problems.join("\n")).toMatch(/kebab-case/);
    expect(problems.join("\n")).toMatch(/pillar "Nope"/);
    expect(problems.join("\n")).toMatch(/80 to 320/);
    expect(problems.join("\n")).toMatch(/Use when/);
  });

  it("rejects an existing name", () => {
    expect(validateScaffold({ name: "genesis", description: DESCRIPTION }, ["genesis"])).toEqual([
      'a workflow named "genesis" already exists',
    ]);
  });

  it("renders frontmatter the build can parse, with the four required sections", () => {
    const { data, body } = parseFrontmatter(
      renderWorkflow({ name: "todo-sweep", description: DESCRIPTION, pillar: "Review" }),
    );
    expect(data).toMatchObject({ name: "todo-sweep", pillar: "Review", engines: "both" });
    expect(data.description).toBe(DESCRIPTION);
    for (const title of ["When to use", "Procedure", "Stop conditions", "Verify"]) {
      expect(body).toContain(`## ${title}\n`);
    }
    expect([...body.matchAll(/^### (\d+)\. /gm)].map((m) => m[1])).toEqual(["1", "2", "3"]);
  });

  it("writes the file, then refuses to overwrite it", () => {
    const path = scaffoldWorkflow({ name: "todo-sweep", description: DESCRIPTION }, dir);
    expect(readFileSync(path, "utf8")).toContain("name: todo-sweep");
    expect(() => scaffoldWorkflow({ name: "todo-sweep", description: DESCRIPTION }, dir)).toThrow(
      /already exists/,
    );
  });

  it("reports every problem at once and writes nothing", () => {
    writeFileSync(join(dir, "keep.md"), "x");
    expect(() => scaffoldWorkflow({ name: "Bad Name", description: "no" }, dir)).toThrow(
      /kebab-case[\s\S]*80 to 320/,
    );
  });
});
