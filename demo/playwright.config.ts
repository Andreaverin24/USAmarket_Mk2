import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "demo-navigation.spec.ts",
  outputDir: "./test-results",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:8088",
    channel: "msedge",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/serve-demo.mjs",
    cwd: __dirname,
    url: "http://127.0.0.1:8088",
    reuseExistingServer: true,
    timeout: 30_000
  }
});
