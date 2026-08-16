import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/convex/**/*.test.ts"],
    exclude: [".claude/**", "node_modules/**"],
  },
});
