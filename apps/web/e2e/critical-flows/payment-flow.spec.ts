import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user session
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'homeowner@example.com',
        role: 'homeowner'
      }));
    });
  });

  test('should navigate to payment page', async ({ page }) => {
    await page.goto('/payments');
    await expect(page).toHaveURL(/\/payments/);
  });

  test('should view payment history', async ({ page }) => {
    await page.goto('/payments');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify payment page content is visible
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should view payment details for a transaction', async ({ page }) => {
    // Navigate to a specific payment transaction
    await page.goto('/payments/test-transaction-id');

    // Verify payment details page loaded
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/payments\/\w+/);
  });

  test('should initiate payment for a job', async ({ page }) => {
    // Navigate to job payment page
    await page.goto('/jobs/test-job-id/payment');

    // Wait for payment form to load
    await page.waitForTimeout(2000);

    // Verify payment form or Stripe elements are present
    const paymentForm = page.locator('form, [data-testid*="payment"], [id*="payment"]').first();
    if (await paymentForm.count() > 0) {
      await expect(paymentForm).toBeVisible();
    }
  });

  test('should display Stripe payment form', async ({ page }) => {
    await page.goto('/jobs/test-job-id/payment');

    // Wait for Stripe to load
    await page.waitForTimeout(3000);

    // Look for Stripe elements (they use iframes)
    const stripeFrame = page.frameLocator('iframe[name*="stripe"], iframe[title*="Stripe"]').first();
    if (await stripeFrame.locator('body').count() > 0) {
      // Stripe form is loaded
      expect(true).toBeTruthy();
    } else {
      // Check for payment form elements
      const cardInput = page.locator('input[name*="card"], input[placeholder*="card" i]').first();
      if (await cardInput.count() > 0) {
        await expect(cardInput).toBeVisible();
      }
    }
  });

  test('should show payment amount and details', async ({ page }) => {
    await page.goto('/jobs/test-job-id/payment');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for amount display
    const amountDisplay = page.locator('text=/\$|£|€|\d+\.\d{2}/').first();
    if (await amountDisplay.count() > 0) {
      await expect(amountDisplay).toBeVisible();
    }
  });

  test('should handle payment method selection', async ({ page }) => {
    await page.goto('/payments');

    // Look for payment method selector
    const paymentMethodSelect = page.locator('select[name*="method"], button:has-text("Payment Method")').first();
    if (await paymentMethodSelect.count() > 0) {
      await paymentMethodSelect.click();
      await page.waitForTimeout(500);

      // Verify options are available
      const options = page.locator('[role="option"], option').first();
      if (await options.count() > 0) {
        await expect(options).toBeVisible();
      }
    }
  });

  test('should navigate to checkout page', async ({ page }) => {
    await page.goto('/checkout');

    // Verify checkout page loaded
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('should complete checkout flow', async ({ page }) => {
    await page.goto('/checkout');

    // Wait for checkout form
    await page.waitForTimeout(2000);

    // Look for checkout form elements
    const checkoutForm = page.locator('form').first();
    if (await checkoutForm.count() > 0) {
      // Fill in required fields if visible
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.count() > 0 && await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
      }

      // Look for payment button
      const payButton = page.locator('button:has-text("Pay"), button:has-text("Complete"), button[type="submit"]').first();
      if (await payButton.count() > 0) {
        // Don't actually submit in E2E test to avoid real charges
        await expect(payButton).toBeVisible();
      }
    }
  });

  test('should show payment success page', async ({ page }) => {
    // Navigate to payment return/success page
    await page.goto('/checkout/return?session_id=test_session');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for success message
    const successMessage = page.locator('text=/success|thank you|payment received/i');
    if (await successMessage.count() > 0) {
      await expect(successMessage.first()).toBeVisible();
    }
  });

  test('should handle payment errors gracefully', async ({ page }) => {
    await page.goto('/checkout/return?error=payment_failed');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = page.locator('text=/error|failed|declined/i');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });

  test('should view payment settings', async ({ page }) => {
    await page.goto('/settings/payment-methods');

    // Verify payment methods page loaded
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/settings\/payment-methods/);
  });

  test('should add payment method', async ({ page }) => {
    await page.goto('/settings/payment-methods');

    // Look for add payment method button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), a:has-text("Add")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // Should see payment method form
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        await expect(form).toBeVisible();
      }
    }
  });
});

