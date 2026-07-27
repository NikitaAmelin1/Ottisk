import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "smoke.spec.js",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:8765",
    ...devices["iPhone 13"],
    browserName: "chromium",
    locale: "ru-RU",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run serve",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
