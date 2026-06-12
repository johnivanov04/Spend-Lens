import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke test config. Runs against a locally-started dev server.
 *
 * The smoke test deliberately covers PUBLIC routes only (landing, login, signup,
 * pricing, and the protected-route redirect) so it needs no Supabase credentials
 * and stays non-flaky. The authenticated flow (onboarding → classify → dashboard →
 * summary) is covered by the unit/component suite and the manual demo flow in the
 * README. Run with: `npm run test:e2e`. It is separate from `npm test`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
