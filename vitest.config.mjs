import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Live API calls take a few seconds; offline unit tests finish well under this.
    testTimeout: 120000,
  },
});
