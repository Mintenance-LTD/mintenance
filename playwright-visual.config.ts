import { defineConfig, devices } from '@playwright/test';

/**
 * Visual Regression Testing Configuration
 * Extends the main Playwright config with visual testing specifics
 */
export default defineConfig({
  testDir: './e2e/visual',
  testMatch: '**/*.visual.spec.js',

  fullyParallel: false, // Run visual tests sequentially for consistency

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1, // Single worker for consistent screenshots

  reporter: [
    ['html', { outputFolder: 'visual-regression-report' }],
    ['json', { outputFile: 'visual-regression-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',

    trace: 'retain-on-failure',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    // Visual testing specific options
    ignoreHTTPSErrors: true,

    // Ensure consistent rendering
    viewport: { width: 1280, height: 720 },

    // Wait for fonts and images
    waitForLoadState: 'networkidle',
  },

  expect: {
    // Visual regression threshold
    toHaveScreenshot: {
      // Allow 5% difference for anti-aliasing and rendering differences
      maxDiffPixelRatio: 0.05,

      // Animation disabling
      animations: 'disabled',

      // Ensure consistent scaling
      scale: 'css',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
