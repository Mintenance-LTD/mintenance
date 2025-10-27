import { test, expect } from '@playwright/test';

test.describe('Basic E2E Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Check for key elements
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Click on login link
    await page.click('a[href="/login"]');
    
    // Check if we're on the login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    
    // Click on register link
    await page.click('a[href="/register"]');
    
    // Check if we're on the register page
    await expect(page).toHaveURL(/.*register/);
  });
});
