/**
 * Baseline Screenshot Capture for Migration
 * 
 * This test suite captures baseline screenshots BEFORE any migration changes.
 * These screenshots will be used to verify that the web app appearance remains
 * unchanged throughout the migration process.
 * 
 * Run this BEFORE starting Phase 1 migration.
 * @visual
 */

const { test, expect } = require('@playwright/test');

test.describe('Baseline Screenshot Capture - Pre-Migration @visual', () => {
  // Homepage baselines
  test('baseline: homepage desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('baseline-homepage-desktop.png', {
      fullPage: true,
    });
  });

  test('baseline: homepage mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('baseline-homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('baseline: homepage tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('baseline-homepage-tablet.png', {
      fullPage: true,
    });
  });

  // Login page baselines
  test('baseline: login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('baseline-login-page.png', {
      fullPage: true,
    });
  });

  test('baseline: login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('baseline-login-form.png');
  });

  // Register page baselines
  test('baseline: register page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('baseline-register-page.png', {
      fullPage: true,
    });
  });

  // Component baselines
  test('baseline: button components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const buttons = page.locator('button').first();
    if (await buttons.count() > 0) {
      await expect(buttons.first()).toHaveScreenshot('baseline-button-component.png');
    }
  });

  test('baseline: input components', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const inputs = page.locator('input[type="email"], input[type="password"]').first();
    if (await inputs.count() > 0) {
      await expect(inputs.first()).toHaveScreenshot('baseline-input-component.png');
    }
  });

  test('baseline: card components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[class*="card"], [class*="Card"]').first();
    if (await cards.count() > 0) {
      await expect(cards.first()).toHaveScreenshot('baseline-card-component.png');
    }
  });

  // Navigation baselines
  test('baseline: header navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const header = page.locator('header, nav').first();
    if (await header.count() > 0) {
      await expect(header.first()).toHaveScreenshot('baseline-header-navigation.png');
    }
  });

  // Note: Dashboard and contractor pages require authentication
  // These will be captured separately if authentication helpers are available
});

