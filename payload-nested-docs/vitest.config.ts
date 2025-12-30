import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/vitest.setup.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
