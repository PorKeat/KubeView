import { defineConfig, devices } from "@playwright/test";

/**
 * Specs that need a reachable Kubernetes cluster. They are kept out of the
 * default (hermetic) project so CI can run the mocked suite without a cluster.
 * Run them explicitly with `pnpm test:e2e:live`.
 */
const LIVE_SPECS = [
  "**/*live*.spec.ts",
  "**/accessibility-keyboard.spec.ts",
  "**/app-navigation.spec.ts",
  "**/cluster-overview.spec.ts",
  "**/cluster-switcher.spec.ts",
  "**/deep-conditions.spec.ts",
  "**/pods-management.spec.ts",
  "**/responsive-settings.spec.ts",
  "**/workload-bulk-selection.spec.ts",
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3005",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "mock",
      testIgnore: LIVE_SPECS,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "live",
      testMatch: LIVE_SPECS,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
