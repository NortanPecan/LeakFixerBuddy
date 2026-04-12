import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    // Resolves @/* path aliases from tsconfig.json
    // Note: vitest 4.x shows an informational warning about this plugin being
    // superseded — ignore it, native resolve.tsconfigPaths doesn't work on Windows.
    tsconfigPaths(),
  ],
  test: {
    // Use jsdom for components, node for pure logic
    environment: "node",
    globals: true,

    // Setup file — extends expect with jest-dom matchers
    setupFiles: ["./src/test/setup.ts"],

    // Where to find tests
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      // Exclude the existing Bun test (it uses bun:test imports)
      "!src/lib/leak-policy.test.ts",
    ],

    // Coverage via v8
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        ".next/**",
        "src/test/**",
        "src/**/*.d.ts",
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/app/error.tsx",
        "src/app/global-error.tsx",
        "prisma/**",
        "scripts/**",
        "*.config.*",
      ],
      // Thresholds for critical modules
      thresholds: {
        "src/lib/errors.ts": { lines: 90, functions: 90 },
        "src/lib/rate-limit.ts": { lines: 70, functions: 70 },
        "src/lib/api-handler.ts": { lines: 70, functions: 70 },
      },
    },
  },
});
