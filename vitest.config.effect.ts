import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src-effect/**/*.test.ts"],
    globals: true,
    environment: "node"
  }
})
