/**
 * Visual Regression Tests
 *
 * Uses Playwright's built-in screenshot comparison to detect visual changes.
 * Baselines live in visual-regression.spec.ts-snapshots/ and are generated on Linux.
 *
 * First run generates baselines; subsequent runs compare against them.
 * To update baselines: npx playwright test visual-regression --update-snapshots
 */

import { test, expect } from './fixtures';
import { prepareVisualPage } from './helpers/prepare-visual-page';

const REVEAL_HEADINGS: Record<string, string[]> = {
  landing: ['Whatever the house needs.', 'Mint AI guidance'],
  pricing: ['Frequently Asked Questions', 'Still have questions?'],
  about: [
    'Our Mission',
    'Our Values',
    'Our Journey',
    'Our Story',
    'Join Our Growing Community',
  ],
};

async function preparePage(
  page: import('@playwright/test').Page,
  name: string
) {
  // Avoid accepting a login/error page or a missing section as a new baseline.
  for (const heading of REVEAL_HEADINGS[name] ?? []) {
    await expect(
      page.getByRole('heading', { name: heading, exact: true })
    ).toHaveCount(1);
  }
  await prepareVisualPage(page);
  // Parallel CI traffic can show this short-lived session back-off notice.
  // Let it dismiss normally; never bake it into a baseline or hide app errors.
  await expect(
    page.getByText(
      'Session check paused for 2 minutes (rate-limited). We will retry automatically. If you are about to be signed out, click "Extend Session" when the warning appears.',
      { exact: true }
    )
  ).toBeHidden({ timeout: 15_000 });
}

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
      await preparePage(page, name);

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
      await preparePage(page, 'landing');

      await expect(page).toHaveScreenshot(`landing-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
