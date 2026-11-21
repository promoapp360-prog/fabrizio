import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  outputDir: "./generated-artifacts/browser",
  use: {
    baseURL: "http://127.0.0.1:4179",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "vite --config tests/browser/vite.config.ts",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
  },
});
