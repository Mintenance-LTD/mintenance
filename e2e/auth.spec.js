// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Check if login page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name*="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Assertions MUST fail if elements are missing (removed silent-pass guards)
    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
    await expect(submitButton.first()).toBeVisible();
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    await expect(page).toHaveTitle(/Mintenance/);

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name*="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');

    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
    await expect(submitButton.first()).toBeVisible();
  });

  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();

    await page.waitForTimeout(2000);

    // Error message must appear after invalid login
    const errorMessage = page.locator('.error, .alert, [role="alert"], .text-red, .text-error');
    await expect(errorMessage.first()).toBeVisible();
  });

  test('should have password requirements visible', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    const passwordHelp = page.locator('.password-help, .password-requirements, [data-testid*="password"], .form-help');
    await expect(passwordHelp.first()).toBeVisible();
  });

  test('should have working forgot password link', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a[href*="reset"], a[href*="forgot"]');
    await expect(forgotPasswordLink.first()).toBeVisible();

    await forgotPasswordLink.first().click();
    await page.waitForTimeout(1000);

    expect(page.url()).toMatch(/reset|forgot/);
  });
});
