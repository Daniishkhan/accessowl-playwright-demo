import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/fixtures",
  timeout: 30_000,
  retries: 0,
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure"
  }
});
