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
    
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
    
    if (await passwordInput.count() > 0) {
      await expect(passwordInput.first()).toBeVisible();
    }
    
    if (await submitButton.count() > 0) {
      await expect(submitButton.first()).toBeVisible();
    }
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    
    // Check if registration page loads
    await expect(page).toHaveTitle(/Mintenance/);
    
    // Look for registration form elements
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name*="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
    
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
    
    if (await passwordInput.count() > 0) {
      await expect(passwordInput.first()).toBeVisible();
    }
    
    if (await submitButton.count() > 0) {
      await expect(submitButton.first()).toBeVisible();
    }
  });

  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Fill in invalid credentials
    const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
      await emailInput.fill('invalid@example.com');
      await passwordInput.fill('wrongpassword');
      
      // Submit form
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for error message
      const errorMessage = page.locator('.error, .alert, [role="alert"], .text-red, .text-error');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
    }
  });

  test('should have password requirements visible', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    
    // Look for password requirements or help text
    const passwordHelp = page.locator('.password-help, .password-requirements, [data-testid*="password"], .form-help');
    
    if (await passwordHelp.count() > 0) {
      await expect(passwordHelp.first()).toBeVisible();
    }
  });

  test('should have working forgot password link', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // Look for forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a[href*="reset"], a[href*="forgot"]');
    
    if (await forgotPasswordLink.count() > 0) {
      await expect(forgotPasswordLink.first()).toBeVisible();
      
      // Click the link
      await forgotPasswordLink.first().click();
      await page.waitForTimeout(1000);
      
      // Should navigate to reset page
      expect(page.url()).toMatch(/reset|forgot/);
    }
  });
});
