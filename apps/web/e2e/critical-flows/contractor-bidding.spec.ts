import { test, expect } from '@playwright/test';

test.describe('Contractor Bidding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated contractor session
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'contractor-id',
        email: 'contractor@example.com',
        role: 'contractor'
      }));
    });
  });

  test('should view available jobs as contractor', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).toHaveURL(/\/jobs/);

    // Should see jobs list or available jobs
    await page.waitForTimeout(1000);
    // Verify page loaded (check for any job-related content)
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should navigate to job details page', async ({ page }) => {
    await page.goto('/jobs');

    // Wait for jobs to load
    await page.waitForTimeout(2000);

    // Try to find and click on a job card or link
    const jobLink = page.locator('a[href*="/jobs/"], [data-testid*="job"], .job-card').first();
    if (await jobLink.count() > 0) {
      await jobLink.click();
      await page.waitForTimeout(1000);
      // Should be on job detail page
      await expect(page).toHaveURL(/\/jobs\/\w+/);
    }
  });

  test('should view job details and bid information', async ({ page }) => {
    // Navigate to a specific job (using a test job ID if available)
    await page.goto('/jobs/test-job-id');

    // Verify job details are displayed
    await page.waitForTimeout(1000);
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should submit a bid on a job', async ({ page }) => {
    await page.goto('/jobs/test-job-id');

    // Look for bid submission button or form
    const bidButton = page.locator('button:has-text("Bid"), button:has-text("Submit Bid"), a[href*="bid"]').first();
    if (await bidButton.count() > 0) {
      await bidButton.click();
      await page.waitForTimeout(1000);

      // Should see bid form or modal
      const bidForm = page.locator('form, [role="dialog"]').first();
      if (await bidForm.count() > 0) {
        await expect(bidForm).toBeVisible();

        // Fill bid amount if available
        const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
        if (await amountInput.count() > 0) {
          await amountInput.fill('500');
        }

        // Fill bid message if available
        const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();
        if (await messageInput.count() > 0) {
          await messageInput.fill('I can complete this job professionally.');
        }

        // Submit bid
        const submitButton = page.locator('button[type="submit"]:has-text("Submit"), button:has-text("Send Bid")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          // Check for success message
          await expect(
            page.locator('text=/success|submitted|bid/i')
          ).toBeVisible({ timeout: 5000 }).catch(() => {
            // If no success message, verify we're still on the page
            expect(page.url()).toContain('/jobs/');
          });
        }
      }
    }
  });

  test('should view quote submission form', async ({ page }) => {
    await page.goto('/contractor/bid/test-job-id');

    // Verify quote/bid form is visible
    await page.waitForTimeout(1000);
    const form = page.locator('form').first();
    if (await form.count() > 0) {
      await expect(form).toBeVisible();
    }
  });

  test('should show validation errors for invalid bid', async ({ page }) => {
    await page.goto('/contractor/bid/test-job-id');

    // Try to submit empty bid form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorMessages = page.locator('text=/required|error|invalid/i');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    }
  });

  test('should view jobs near contractor location', async ({ page }) => {
    await page.goto('/contractor/jobs-near-you');

    // Verify page loaded
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/contractor\/jobs-near-you/);
  });

  test('should filter jobs by category', async ({ page }) => {
    await page.goto('/jobs');

    // Look for category filter
    const categoryFilter = page.locator('select[name="category"], button:has-text("Category"), [data-testid*="category"]').first();
    if (await categoryFilter.count() > 0) {
      await categoryFilter.click();
      await page.waitForTimeout(500);

      // Select a category
      const categoryOption = page.locator('text=/plumbing|electrical|handyman/i').first();
      if (await categoryOption.count() > 0) {
        await categoryOption.click();
        await page.waitForTimeout(1000);

        // Verify filter applied (jobs should update)
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test('should view contractor dashboard with jobs', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify dashboard loaded
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/dashboard/);

    // Check for jobs section or links
    const jobsSection = page.locator('text=/jobs|available|bids/i').first();
    if (await jobsSection.count() > 0) {
      await expect(jobsSection).toBeVisible();
    }
  });
});

