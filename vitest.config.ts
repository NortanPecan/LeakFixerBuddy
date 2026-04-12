import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "!src/lib/leak-policy.test.ts"],
    exclude: ["node_modules", ".next"],
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
      thresholds: {
        "src/lib/errors.ts": { lines: 90, functions: 90 },
        "src/lib/rate-limit.ts": { lines: 70, functions: 70 },
        "src/lib/api-handler.ts": { lines: 70, functions: 70 },
      },
    },
  },
});
