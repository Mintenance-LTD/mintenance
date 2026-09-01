import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal unauthenticated Phase 2 smoke test.
 *
 * This intentionally does not load the full E2E global setup or authenticated
 * fixtures. It proves that the web server, browser, base URL, and public login
 * route can work in a clean validation environment.
 */
export default defineConfig({
  testDir: './apps/web/e2e',
  testMatch: /smoke\.spec\.ts/,
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
