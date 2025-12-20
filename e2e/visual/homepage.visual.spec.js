/**
 * Visual Regression Tests for Homepage
 * @visual
 */

const { test, expect } = require('@playwright/test');

test.describe('Homepage Visual Tests @visual', () => {
  test('should match homepage desktop screenshot', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
    });
  });

  test('should match homepage mobile screenshot', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('should match homepage header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header, nav').first();
    await expect(header).toHaveScreenshot('homepage-header.png');
  });

  test('should match homepage footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer').first();
    await expect(footer).toHaveScreenshot('homepage-footer.png');
  });
});

test.describe('Login Page Visual Tests @visual', () => {
  test('should match login page screenshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('should match login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('login-form.png');
  });
});

test.describe('Dashboard Visual Tests @visual', () => {
  test.skip('should match dashboard after login', async ({ page }) => {
    // Note: This test is skipped as it requires authentication
    // Implement authentication flow for real test

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
    });
  });
});

test.describe('Responsive Design Visual Tests @visual', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'wide', width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should match homepage on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`homepage-${name}.png`, {
        fullPage: true,
      });
    });
  });
});

test.describe('Component Visual Tests @visual', () => {
  test('should match button components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find all buttons
    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toHaveScreenshot('button-component.png');
    }
  });

  test('should match input components', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input[type="email"], input[type="password"]').first();
    await expect(inputs).toHaveScreenshot('input-component.png');
  });
});
