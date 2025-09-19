import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    maxThreads: 1,
    minThreads: 1,
    testTimeout: 10000
  }
});
