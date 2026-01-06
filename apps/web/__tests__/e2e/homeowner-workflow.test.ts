import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { test, expect, Page } from '@playwright/test';
import { login, createMockData, cleanupData } from '../helpers';

/**
 * E2E Test Suite: Homeowner Workflow
 * Tests the complete journey from job posting to payment
 */

test.describe('Homeowner Workflow', () => {
  let page: Page;
  let testJobId: string;
  let testPropertyId: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Create test data
    const mockData = await createMockData();
    testPropertyId = mockData.propertyId;

    // Login as homeowner
    await login(page, 'homeowner@test.com', 'Test123!');
  });

  test.afterAll(async () => {
    await cleanupData();
    await page.close();
  });

  test.describe('Job Posting', () => {
    test('should create a job using multi-step form', async () => {
      await page.goto('/jobs/create');

      // Wait for page to load
      await expect(page.locator('h1')).toContainText('What do you need done?');

      // Step 1: Select property and details
      await page.locator(`button[data-property-id="${testPropertyId}"]`).click();
      await page.locator('button:has-text("Plumbing")').click();
      await page.fill('input[placeholder*="Fix leaking"]', 'Fix bathroom leak');
      await page.fill('textarea', 'The bathroom sink is leaking underneath. Water damage visible on cabinet floor. Need urgent repair to prevent further damage.');

      await page.locator('button:has-text("Next")').click();

      // Step 2: Photos (skip for now)
      await expect(page.locator('h1')).toContainText('Add photos');
      await page.locator('button:has-text("Next")').click();

      // Step 3: Budget & Timeline
      await expect(page.locator('h1')).toContainText('Set your budget');
      await page.fill('input[type="number"]', '250');
      await page.locator('button:has-text("Urgent")').click();
      await page.locator('button:has-text("Next")').click();

      // Step 4: Review
      await expect(page.locator('h1')).toContainText('Review and post');
      await expect(page.locator('text=Fix bathroom leak')).toBeVisible();
      await expect(page.locator('text=£250')).toBeVisible();

      // Submit job
      await page.locator('button:has-text("Post Job")').click();

      // Should redirect to job details
      await page.waitForURL(/\/jobs\/[a-z0-9-]+$/);
      const url = page.url();
      testJobId = url.split('/jobs/')[1];

      // Verify job was created
      await expect(page.locator('h1')).toContainText('Fix bathroom leak');
      await expect(page.locator('text=£250')).toBeVisible();
    });

    test('should create a quick job', async () => {
      await page.goto('/jobs/quick-create');

      // Select template
      await page.locator('button:has-text("Leaky Tap/Pipe")').click();

      // Verify form is pre-filled
      const titleInput = page.locator('input[placeholder*="What needs fixing"]');
      await expect(titleInput).toHaveValue('Leaky Tap/Pipe');

      // Select budget and urgency
      await page.locator('button:has-text("£100-200")').click();
      await page.locator('button:has-text("Today")').click();

      // Submit
      await page.locator('button:has-text("Post Job")').click();

      // Should redirect to job details
      await page.waitForURL(/\/jobs\/[a-z0-9-]+$/);
      await expect(page.locator('h1')).toContainText('Leaky Tap/Pipe');
    });
  });

  test.describe('Bid Review', () => {
    test('should display bids on job details page', async () => {
      await page.goto(`/jobs/${testJobId}`);

      // Wait for bids section
      await page.waitForSelector('[data-testid="bids-section"]', { timeout: 10000 });

      // Check bid count
      const bidCount = await page.locator('[data-testid="bid-card"]').count();
      expect(bidCount).toBeGreaterThan(0);

      // Verify bid information is displayed
      const firstBid = page.locator('[data-testid="bid-card"]').first();
      await expect(firstBid.locator('[data-testid="contractor-name"]')).toBeVisible();
      await expect(firstBid.locator('[data-testid="bid-amount"]')).toBeVisible();
      await expect(firstBid.locator('[data-testid="bid-message"]')).toBeVisible();
    });

    test('should switch between list and swipe view', async () => {
      await page.goto(`/jobs/${testJobId}`);

      // Default should be list view
      await expect(page.locator('text=Compare Bids')).toBeVisible();

      // Switch to swipe view
      await page.locator('button:has-text("Swipe View")').click();
      await expect(page.locator('text=Review Bids')).toBeVisible();

      // Switch back to list view
      await page.locator('button:has-text("List View")').click();
      await expect(page.locator('text=Compare Bids')).toBeVisible();
    });

    test('should sort bids', async () => {
      await page.goto(`/jobs/${testJobId}`);

      // Sort by price
      await page.locator('button:has-text("Price")').click();
      let amounts = await page.locator('[data-testid="bid-amount"]').allTextContents();
      let prices = amounts.map(a => parseFloat(a.replace('£', '')));
      expect(prices).toEqual([...prices].sort((a, b) => a - b));

      // Sort by rating
      await page.locator('button:has-text("Rating")').click();
      let ratings = await page.locator('[data-testid="contractor-rating"]').allTextContents();
      let ratingValues = ratings.map(r => parseFloat(r));
      expect(ratingValues).toEqual([...ratingValues].sort((a, b) => b - a));
    });
  });

  test.describe('Contractor Selection', () => {
    test('should accept a bid', async () => {
      await page.goto(`/jobs/${testJobId}`);

      // Find and click accept on first bid
      const firstBid = page.locator('[data-testid="bid-card"]').first();
      await firstBid.locator('button:has-text("Accept")').click();

      // Confirm in dialog
      await page.locator('button:has-text("Confirm")').click();

      // Wait for success message
      await expect(page.locator('text=Bid accepted successfully')).toBeVisible();

      // Verify job status changed
      await expect(page.locator('[data-testid="job-status"]')).toContainText('Assigned');

      // Message contractor button should appear
      await expect(page.locator('button:has-text("Message Contractor")')).toBeVisible();
    });

    test('should reject a bid', async () => {
      // Create a new job for this test
      await page.goto('/jobs/quick-create');
      await page.locator('button:has-text("General Repair")').click();
      await page.locator('button:has-text("Post Job")').click();
      await page.waitForURL(/\/jobs\/[a-z0-9-]+$/);

      // Wait for bids
      await page.waitForSelector('[data-testid="bid-card"]', { timeout: 10000 });

      // Reject first bid
      const firstBid = page.locator('[data-testid="bid-card"]').first();
      await firstBid.locator('button:has-text("Reject")').click();

      // Confirm rejection
      await page.locator('button:has-text("Confirm")').click();

      // Verify bid is marked as rejected
      await expect(firstBid.locator('[data-testid="bid-status"]')).toContainText('Rejected');
    });
  });

  test.describe('Payment Flow', () => {
    test('should navigate to payment page', async () => {
      await page.goto(`/jobs/${testJobId}`);

      // Click pay now button
      await page.locator('button:has-text("Pay Now")').click();

      // Should redirect to payment page
      await expect(page).toHaveURL(`/jobs/${testJobId}/payment`);

      // Verify payment page elements
      await expect(page.locator('h1')).toContainText('Secure Payment');
      await expect(page.locator('text=Job Summary')).toBeVisible();
      await expect(page.locator('text=Payment Terms & Escrow Protection')).toBeVisible();
    });

    test('should display payment summary', async () => {
      await page.goto(`/jobs/${testJobId}/payment`);

      // Check job details are shown
      await expect(page.locator('text=Fix bathroom leak')).toBeVisible();
      await expect(page.locator('text=£250')).toBeVisible();

      // Check escrow information
      await expect(page.locator('text=held in escrow')).toBeVisible();
      await expect(page.locator('text=Funds are only released')).toBeVisible();
    });

    test('should handle payment form (mock)', async () => {
      await page.goto(`/jobs/${testJobId}/payment`);

      // Check for payment form
      const paymentForm = page.locator('[data-testid="payment-form"]');
      await expect(paymentForm).toBeVisible();

      // Mock Stripe elements would go here
      // For now, just verify the form structure exists
      await expect(page.locator('text=Cardholder Name')).toBeVisible();
      await expect(page.locator('button:has-text("Pay £")')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for invalid job ID', async () => {
      await page.goto('/jobs/invalid-job-id');

      // Should redirect to jobs list or show error
      await expect(page).toHaveURL('/jobs');
    });

    test('should validate required fields in job creation', async () => {
      await page.goto('/jobs/create');

      // Try to proceed without selecting property
      await page.locator('button:has-text("Next")').click();

      // Should not advance to next step
      await expect(page.locator('h1')).toContainText('What do you need done?');
    });

    test('should handle network errors gracefully', async () => {
      // Intercept API calls and force failure
      await page.route('**/api/jobs', route => route.abort());

      await page.goto('/jobs/create');

      // Fill form and try to submit
      // ... fill form steps ...

      // Should show error message
      // await expect(page.locator('text=Failed to post job')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      await page.goto('/jobs/create');

      // Check for ARIA labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();

        // Button should have either aria-label or visible text
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async () => {
      await page.goto('/jobs/create');

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to select with Enter
      await page.keyboard.press('Enter');

      // Verify some interaction occurred
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    });
  });
});

// Performance tests
test.describe('Performance', () => {
  test('should load job creation page quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/jobs/create');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test('should handle large number of bids efficiently', async ({ page }) => {
    // This would need mock data with many bids
    // Verify pagination or virtualization is working
  });
});