/**
 * Visual Regression Tests - Post Migration
 * 
 * This test suite compares current screenshots against baseline screenshots
 * captured before migration to ensure zero visual changes.
 * 
 * Run this AFTER Phase 4 (Component Migration) to verify no visual regressions.
 * @visual
 */

const { test, expect } = require('@playwright/test');

test.describe('Visual Regression Tests - Post Migration @visual', () => {
  // Homepage visual regression tests
  test('homepage desktop - should match baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for any animations or dynamic content to settle
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01, // Allow 1% pixel difference for minor rendering differences
    });
  });

  test('homepage mobile - should match baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('homepage tablet - should match baseline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('homepage wide - should match baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('homepage-wide.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  // Login page visual regression tests
  test('login page - should match baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  // Component visual regression tests
  test('button component - should match baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const buttons = page.locator('button').first();
    if (await buttons.count() > 0) {
      await expect(buttons.first()).toHaveScreenshot('button-component.png', {
        maxDiffPixelRatio: 0.01,
      });
    } else {
      test.skip();
    }
  });

  test('input component - should match baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const inputs = page.locator('input[type="email"], input[type="password"]').first();
    if (await inputs.count() > 0) {
      await expect(inputs.first()).toHaveScreenshot('input-component.png', {
        maxDiffPixelRatio: 0.01,
      });
    } else {
      test.skip();
    }
  });

  test('card component - should match baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const cards = page.locator('[class*="card"], [class*="Card"]').first();
    if (await cards.count() > 0) {
      await expect(cards.first()).toHaveScreenshot('card-component.png', {
        maxDiffPixelRatio: 0.01,
      });
    } else {
      test.skip();
    }
  });
});

