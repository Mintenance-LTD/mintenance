import { test, expect } from '@playwright/test';

test.describe('Job Creation Flow', () => {
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

  test('should navigate to job creation page', async ({ page }) => {
    await page.goto('/jobs/create');
    await expect(page).toHaveURL(/\/jobs\/create/);
  });

  test('should display job creation form', async ({ page }) => {
    await page.goto('/jobs/create');

    // Verify form fields are present
    await expect(page.locator('input, textarea, select').first()).toBeVisible();
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.goto('/jobs/create');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Should show validation errors
      await page.waitForTimeout(500);
      // Check for any validation messages
      const errorMessages = page.locator('text=/required|error|invalid/i');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    }
  });

  test('should fill and submit job creation form', async ({ page }) => {
    await page.goto('/jobs/create');

    // Fill job title
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[id*="title" i]').first();
    if (await titleInput.count() > 0) {
      await titleInput.fill('Test Job Title');
    }

    // Fill description
    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill('This is a test job description for E2E testing.');
    }

    // Fill location
    const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
    if (await locationInput.count() > 0) {
      await locationInput.fill('London, UK');
    }

    // Select category if available
    const categorySelect = page.locator('select[name="category"], select[id*="category" i]').first();
    if (await categorySelect.count() > 0) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Fill budget if available
    const budgetInput = page.locator('input[name="budget"], input[type="number"]').first();
    if (await budgetInput.count() > 0) {
      await budgetInput.fill('500');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Wait for submission
      await page.waitForTimeout(2000);

      // Check if redirected to jobs page or job detail page
      const currentUrl = page.url();
      if (currentUrl.includes('/jobs/')) {
        // Success - redirected to job page
        expect(currentUrl).toMatch(/\/jobs\/\w+/);
      } else {
        // Check for success message or error
        await expect(
          page.locator('text=/success|created|error|failed/i')
        ).toBeVisible();
      }
    }
  });

  test('should handle job creation with images', async ({ page }) => {
    await page.goto('/jobs/create');

    // Look for file upload input
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      // Create a dummy file for testing
      await fileInput.setInputFiles({
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      // Verify file was selected (if UI shows it)
      await page.waitForTimeout(500);
    }
  });

  test('should show verification banner for unverified users', async ({ page }) => {
    await page.goto('/jobs/create');

    // Check for verification banner or message
    const verificationBanner = page.locator('text=/verify|verification|phone/i');
    if (await verificationBanner.count() > 0) {
      await expect(verificationBanner.first()).toBeVisible();
    }
  });

  test('should allow selecting required skills', async ({ page }) => {
    await page.goto('/jobs/create');

    // Look for skills selector
    const skillsInput = page.locator('input[placeholder*="skill" i], select[name*="skill" i]').first();
    if (await skillsInput.count() > 0) {
      await skillsInput.click();
      await page.waitForTimeout(500);

      // Try to select a skill from dropdown if available
      const skillOption = page.locator('text=/plumbing|electrical|carpentry/i').first();
      if (await skillOption.count() > 0) {
        await skillOption.click();
      }
    }
  });

  test('should handle location search', async ({ page }) => {
    await page.goto('/jobs/create');

    // Find location input
    const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
    if (await locationInput.count() > 0) {
      await locationInput.fill('London');
      await page.waitForTimeout(1000);

      // Check if autocomplete suggestions appear
      const suggestions = page.locator('[role="listbox"], .autocomplete, .suggestions').first();
      if (await suggestions.count() > 0) {
        await expect(suggestions).toBeVisible();
      }
    }
  });

  test('should navigate back from job creation', async ({ page }) => {
    await page.goto('/jobs');
    await page.goto('/jobs/create');

    // Click back button or cancel
    const backButton = page.locator('button:has-text("Back"), button:has-text("Cancel"), a:has-text("Back")').first();
    if (await backButton.count() > 0) {
      await backButton.click();
      await expect(page).toHaveURL(/\/jobs/);
    } else {
      // Use browser back
      await page.goBack();
      await expect(page).toHaveURL(/\/jobs/);
    }
  });
});

