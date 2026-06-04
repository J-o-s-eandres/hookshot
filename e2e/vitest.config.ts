import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.e2e.test.ts"],
    // Arrancamos procesos reales: sin paralelismo entre archivos y timeouts altos.
    fileParallelism: false,
    hookTimeout: 40_000,
    testTimeout: 40_000,
  },
});
