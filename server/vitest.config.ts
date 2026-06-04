import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cada archivo de test arranca su propia app con DB en memoria,
    // por lo que los ejecutamos en serie para evitar choques de estado.
    fileParallelism: false,
    environment: "node",
    include: ["test/**/*.test.ts"],
    hookTimeout: 20000,
    testTimeout: 20000,
  },
});
