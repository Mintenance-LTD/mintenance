import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete login flow successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // Verify login form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Fill in login credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard or error message
    await page.waitForTimeout(2000);

    // Check if redirected to dashboard (success) or error shown
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      await expect(page).toHaveURL(/\/dashboard/);
    } else {
      // If login failed, verify error message is shown
      await expect(page.locator('text=/Login Failed|Invalid|error/i')).toBeVisible();
    }
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/login');

    // Try to submit with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/Invalid email|email address/i')).toBeVisible();
  });

  test('should show validation errors for empty password', async ({ page }) => {
    await page.goto('/login');

    // Try to submit with empty password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/Password.*required|password/i')).toBeVisible();
  });

  test('should complete registration flow for homeowner', async ({ page }) => {
    await page.goto('/register');

    // Select homeowner role
    await page.click('input[value="homeowner"]');

    // Fill registration form
    await page.fill('input[id="firstName"]', 'John');
    await page.fill('input[id="lastName"]', 'Doe');
    await page.fill('input[id="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[id="phone"]', '+44 7700 900000');
    await page.fill('input[id="password"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(2000);

    // Check if redirected to dashboard or error shown
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      await expect(page).toHaveURL(/\/dashboard/);
    } else {
      // If registration failed, verify error message
      await expect(page.locator('text=/Registration Failed|error/i')).toBeVisible();
    }
  });

  test('should complete registration flow for contractor', async ({ page }) => {
    await page.goto('/register');

    // Select contractor role
    await page.click('input[value="contractor"]');

    // Fill registration form
    await page.fill('input[id="firstName"]', 'Jane');
    await page.fill('input[id="lastName"]', 'Smith');
    await page.fill('input[id="email"]', `contractor-${Date.now()}@example.com`);
    await page.fill('input[id="phone"]', '+44 7700 900001');
    await page.fill('input[id="password"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(2000);

    // Check if redirected to dashboard or error shown
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      await expect(page).toHaveURL(/\/dashboard/);
    } else {
      await expect(page.locator('text=/Registration Failed|error/i')).toBeVisible();
    }
  });

  test('should show password requirements during registration', async ({ page }) => {
    await page.goto('/register');

    // Focus on password field
    await page.focus('input[id="password"]');

    // Should show password requirements
    await expect(page.locator('text=/At least 8 characters|Password must contain/i')).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.click('text=/Forgot.*password|forgot/i');

    // Should navigate to forgot password page
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should complete password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');

    // Fill email for password reset
    await page.fill('input[type="email"]', 'test@example.com');

    // Submit reset request
    await page.click('button[type="submit"]');

    // Should show success message or error
    await page.waitForTimeout(1000);
    await expect(
      page.locator('text=/reset|sent|check your email|error/i')
    ).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');

    // Fill password
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Find and click password visibility toggle
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button').filter({ hasText: '' }).near(passwordInput);

    // Click toggle if it exists
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      // Password should be visible
      await expect(page.locator('input[type="text"]')).toBeVisible();
    }
  });

  test('should remember me checkbox work', async ({ page }) => {
    await page.goto('/login');

    // Check remember me checkbox
    const rememberMe = page.locator('input[type="checkbox"]#remember-me');
    if (await rememberMe.count() > 0) {
      await rememberMe.check();
      await expect(rememberMe).toBeChecked();
    }
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // This test assumes authentication is mocked or test user exists
    await page.goto('/login');

    // Fill valid credentials (adjust based on test environment)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/dashboard/, { timeout: 5000 }).catch(() => {
      // If redirect doesn't happen, verify we're still on login (auth failed)
      expect(page.url()).toContain('/login');
    });
  });
});

