/**
 * Visual Regression Tests
 *
 * Uses Playwright's built-in screenshot comparison to detect visual changes.
 * Baseline screenshots are stored in e2e/__screenshots__/ and committed to git.
 *
 * First run generates baselines; subsequent runs compare against them.
 * To update baselines: npx playwright test visual-regression --update-snapshots
 */

import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'signup', path: '/auth/signup' },
  { name: 'pricing', path: '/pricing' },
  { name: 'about', path: '/about' },
];

test.describe('Visual Regression - Public Pages', () => {
  for (const { name, path } of PUBLIC_PAGES) {
    test(`${name} page matches baseline`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Hide dynamic content that changes between runs
      await page.evaluate(() => {
        document
          .querySelectorAll('[data-testid="timestamp"], time, .animate-pulse')
          .forEach((el) => ((el as HTMLElement).style.visibility = 'hidden'));
      });

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe('Visual Regression - Responsive', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`landing page at ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`landing-${viewport.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
