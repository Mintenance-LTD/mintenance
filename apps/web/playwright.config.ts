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

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Global setup - authenticate test users before running tests
  globalSetup: require.resolve('./e2e/global-setup.ts'),

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects with different authentication states
  projects: [
    // Unauthenticated tests (auth flows, public pages)
    {
      name: 'unauthenticated',
      testMatch: /auth-flow\.spec\.ts|payment-flow\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Homeowner authenticated tests
    {
      name: 'homeowner',
      testMatch: /authenticated-job-posting\.spec\.ts|job-posting-flow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Load pre-authenticated homeowner state from global setup
        storageState: 'e2e/.auth/homeowner.json',
      },
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
  ],

  // Run local dev server before starting tests
  // Disabled for now - start dev server manually with: npm run dev
  // Uncomment to auto-start server (may take 2+ minutes on first run)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   timeout: 120 * 1000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
