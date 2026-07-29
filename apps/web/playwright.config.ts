import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local for E2E tests
// This ensures Supabase credentials are available for test data seeding
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright Configuration for Mintenance Web App
 * E2E testing for Next.js App Router pages
 *
 * Uses global setup to authenticate test users once and reuse sessions.
 * This solves Supabase session persistence issues.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Run tests in files in parallel
  fullyParallel: false,

  // Run tests serially (one worker) to avoid race conditions
  workers: 1,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only. One retry (not two): with the suite green, a single
  // retry catches genuine flakes, while a second retry mostly triples the
  // cost of real failures (2026-07-28 run: every real failure burned 3×
  // its timeout and pushed the job past its CI budget).
  retries: process.env.CI ? 1 : 0,

  // Global setup - authenticate test users before running tests
  globalSetup: require.resolve('./e2e/global-setup.ts'),

  // Reporter
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video only on retry attempts. 'retain-on-failure' still RECORDS every
    // test and discards on pass — measurable overhead across ~400 CI tests.
    // 'on-first-retry' skips recording entirely unless a test is retried.
    video: 'on-first-retry',
  },

  // Configure projects with different authentication states
  // In CI, tests run across all major browsers and mobile viewports.
  // Locally, only Chromium runs by default for faster feedback.
  projects: [
    // === Chromium (always runs) ===

    // Unauthenticated tests (auth flows, public pages)
    {
      name: 'unauthenticated',
      testMatch: /auth-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Homeowner authenticated tests. payment-flow lives here (not in
    // 'unauthenticated'): /checkout is middleware-protected by design, so
    // without a session every checkout spec just sees the /auth/login
    // redirect (2026-07-28 CI runs).
    {
      name: 'homeowner',
      testMatch:
        /authenticated-job-posting\.spec\.ts|job-posting-flow\.spec\.ts|payment-flow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Load pre-authenticated homeowner state from global setup
        storageState: 'e2e/.auth/homeowner.json',
      },
    },

    // Accessibility tests (unauthenticated pages)
    {
      name: 'accessibility',
      testMatch: /accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Visual regression tests
    {
      name: 'visual-regression',
      testMatch: /visual-regression\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Contractor authenticated tests
    {
      name: 'contractor',
      testMatch: /authenticated-contractor-flow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Load pre-authenticated contractor state
        storageState: 'e2e/.auth/contractor.json',
        // Preserve cookies across navigations
        contextOptions: {
          strictSelectors: false,
        },
      },
    },

    // Full user journey & regression tests (handle auth internally)
    {
      name: 'full-journey',
      testMatch: /full-user-journey\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Critical paths regression suite. Most tests call loginAsHomeowner
    // themselves, but the /checkout specs do not — and /checkout is
    // middleware-protected, so without a session they only ever saw
    // /login?redirect=/checkout and asserted against the login page. Loading
    // the homeowner state is additive: the tests that log in explicitly still
    // do so.
    {
      name: 'regression-critical',
      testMatch: /regression\/critical-paths\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/homeowner.json',
      },
    },

    // Mobile responsive regression suite (fixed mobile viewport)
    {
      name: 'regression-mobile',
      testMatch: /regression\/mobile-responsive\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
      },
    },

    // === Cross-browser projects (opt-in) ===
    // Firefox, WebKit, and mobile viewports re-run auth-flow (the only spec
    // that needs no storageState — these projects have none, so the
    // auth-gated specs could never pass here). They run only when
    // E2E_ALL_BROWSERS=true — the CI workflow sets that on pushes to main,
    // while PR runs stay Chromium-only to fit the CI time budget.

    ...(process.env.E2E_ALL_BROWSERS === 'true'
      ? [
          // Firefox (Desktop)
          {
            name: 'firefox',
            testMatch: /auth-flow\.spec\.ts/,
            use: { ...devices['Desktop Firefox'] },
          },

          // WebKit / Safari (Desktop)
          {
            name: 'webkit',
            testMatch: /auth-flow\.spec\.ts/,
            use: { ...devices['Desktop Safari'] },
          },

          // Mobile Chrome (Pixel 5 viewport)
          {
            name: 'mobile-chrome',
            testMatch: /auth-flow\.spec\.ts/,
            use: { ...devices['Pixel 5'] },
          },

          // Mobile Safari (iPhone 12 viewport)
          {
            name: 'mobile-safari',
            testMatch: /auth-flow\.spec\.ts/,
            use: { ...devices['iPhone 12'] },
          },
        ]
      : []),
  ],

  // Start web server before running tests
  // CI uses production build (already built in workflow); local dev reuses existing server
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
