import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "json-summary"],
      // Hooks, site/main.js and the .mjs scripts run in child processes or an evaluated
      // fake DOM, so v8 cannot see them; their tests live in tests/plugin and tests/site.
      include: ["scripts/build-plugin.ts", "scripts/new-workflow.ts", "src/**/*.ts"],
      thresholds: { statements: 80, branches: 65, functions: 80, lines: 80 },
    },
    include: ["tests/**/*.test.ts"],
  },
});
