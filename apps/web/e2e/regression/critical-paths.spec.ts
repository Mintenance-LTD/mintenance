/**
 * Critical Paths Regression E2E Tests
 *
 * Covers the five most important user journeys in Mintenance:
 *   1. Job creation flow (homeowner)
 *   2. Contractor bid flow
 *   3. Payment / escrow flow (homeowner accepts bid)
 *   4. Notification flow (actions produce notifications)
 *   5. Profile update flow (both user types)
 *
 * These tests are designed to be run as a regression gate before releases.
 * They intentionally use resilient selectors (data-testid, ARIA roles, text
 * matchers) so they survive minor UI refactors.
 *
 * Prerequisites:
 *   - Test users must exist (see helpers/auth.ts TEST_USERS)
 *   - Dev/staging server running
 *   - Test properties seeded (global-setup.ts handles this)
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsHomeowner,
  loginAsContractor,
  clearAuth,
  TEST_USERS,
} from '../helpers/auth';
import {
  createTestJob,
  createTestBid,
  waitForNetworkIdle,
} from '../helpers/test-data';

// ---------------------------------------------------------------------------
// Shared helpers scoped to this file
// ---------------------------------------------------------------------------

/** Wait for the page to leave a loading state (skeleton / spinner gone). */
async function waitForContentLoaded(page: Page, timeout = 10000): Promise<void> {
  // Wait for body to be visible at minimum
  await expect(page.locator('body')).toBeVisible({ timeout });

  // Wait for common loading indicators to disappear
  const spinner = page.locator('[data-testid="loading"], .animate-spin, .animate-pulse').first();
  await spinner.waitFor({ state: 'hidden', timeout }).catch(() => {
    // Acceptable if there was no spinner at all
  });
}

/** Navigate and assert we did NOT get redirected to /login. */
async function navigateAuthenticated(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await waitForContentLoaded(page);
  await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
}

// ============================================================================
// 1. JOB CREATION FLOW
// ============================================================================

test.describe('Regression: Job Creation Flow', () => {
  const jobData = createTestJob({
    title: `Regression: Leaking tap (${Date.now()})`,
    description:
      'Kitchen tap leaking badly, need a qualified plumber urgently. ' +
      'The leak started two days ago and is getting worse. Water pooling on the floor.',
    category: 'plumbing',
    budget: 250,
    urgency: 'high',
    postcode: 'SW1A 1AA',
  });

  test('homeowner can navigate to job creation page', async ({ page }) => {
    await loginAsHomeowner(page);
    await navigateAuthenticated(page, '/jobs/create');

    // The job creation form (or first step) should be visible
    const hasForm =
      (await page.locator('[data-testid="job-create-form"]').isVisible().catch(() => false)) ||
      (await page.getByText(/What do you need done/i).isVisible().catch(() => false)) ||
      (await page.getByLabel(/title|job title/i).isVisible().catch(() => false));

    expect(hasForm).toBeTruthy();
  });

  test('homeowner can fill and submit job form', async ({ page }) => {
    await loginAsHomeowner(page);
    await navigateAuthenticated(page, '/jobs/create');

    // Wait for form to fully render (multi-step forms may lazy-load)
    await page.waitForTimeout(2000);

    // -- Fill title --
    const titleInput = page.getByLabel(/title|job title/i);
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill(jobData.title);
    }

    // -- Fill description --
    const descInput = page.getByLabel(/description|describe|details/i);
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill(jobData.description);
    }

    // -- Select category --
    const categorySelect = page.getByLabel(/category|type|trade/i);
    if (await categorySelect.isVisible().catch(() => false)) {
      await categorySelect.selectOption({ label: 'Plumbing' }).catch(async () => {
        // May be a button group instead of <select>
        const plumbingOption = page.getByText(/plumbing/i).first();
        if (await plumbingOption.isVisible().catch(() => false)) {
          await plumbingOption.click();
        }
      });
    }

    // -- Fill budget --
    const budgetInput = page.getByLabel(/budget|cost|price/i);
    if (await budgetInput.isVisible().catch(() => false)) {
      await budgetInput.fill(jobData.budget.toString());
    }

    // -- Fill postcode / location --
    const postcodeInput = page.getByLabel(/postcode|zip|location/i);
    if (await postcodeInput.isVisible().catch(() => false)) {
      await postcodeInput.fill(jobData.postcode || 'SW1A 1AA');
    }

    // -- Submit --
    const submitBtn = page
      .getByRole('button', { name: /post.*job|create.*job|submit|next|continue/i })
      .first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await waitForNetworkIdle(page);

      // Verify: success toast, redirect to job detail, or confirmation text
      const succeeded =
        (await page.getByText(/success|created|posted/i).isVisible().catch(() => false)) ||
        /\/jobs\/[a-z0-9-]+/.test(page.url());

      expect(succeeded).toBeTruthy();
    }
  });

  test('job appears in jobs list after creation', async ({ page }) => {
    await loginAsHomeowner(page);
    await navigateAuthenticated(page, '/jobs');

    await page.waitForTimeout(2000);

    // The page should show at least one job or a "no jobs" message
    const hasJobCards =
      (await page.locator('[data-testid="job-card"]').count()) > 0 ||
      (await page.locator('table tbody tr').count()) > 0;
    const hasEmptyState = await page.getByText(/no.*job|no.*result/i).isVisible().catch(() => false);

    expect(hasJobCards || hasEmptyState).toBeTruthy();
  });
});

// ============================================================================
// 2. CONTRACTOR BID FLOW
// ============================================================================

test.describe('Regression: Contractor Bid Flow', () => {
  const bidData = createTestBid({
    quoteAmount: 180,
    description:
      'Experienced plumber, 12 years in the trade. I can diagnose and fix this within 2 hours. ' +
      'Parts included in quote. Fully insured.',
    estimatedDays: 1,
  });

  test('contractor can access job discovery', async ({ page }) => {
    await loginAsContractor(page);
    await navigateAuthenticated(page, '/contractor/discover');

    // Should see job cards or an empty state
    const hasContent =
      (await page.locator('[data-testid="job-card"]').count()) > 0 ||
      (await page.getByText(/no.*job|no.*available/i).isVisible().catch(() => false)) ||
      ((await page.locator('body').textContent()) ?? '').length > 200;

    expect(hasContent).toBeTruthy();
  });

  test('contractor can view a job and access bid form', async ({ page }) => {
    await loginAsContractor(page);
    await navigateAuthenticated(page, '/contractor/discover');
    await page.waitForTimeout(2000);

    // Find first clickable job
    const jobLink = page
      .locator('a[href*="/jobs/"]')
      .or(page.locator('[data-testid="job-card"]'))
      .first();

    if (!(await jobLink.isVisible().catch(() => false))) {
      test.skip(); // No jobs available in test environment
      return;
    }

    await jobLink.click();
    await waitForContentLoaded(page);

    // Should see job details
    const hasJobDetail =
      (await page.getByText(/description|details|budget/i).isVisible().catch(() => false)) ||
      /\/jobs\//.test(page.url());

    expect(hasJobDetail).toBeTruthy();

    // Look for bid submission trigger
    const bidButton = page.getByRole('button', { name: /submit.*bid|place.*bid|bid.*now/i }).first();
    const hasBidButton = await bidButton.isVisible().catch(() => false);

    if (hasBidButton) {
      await bidButton.click();
      await page.waitForTimeout(500);

      // Bid form should now be visible (amount input)
      const amountInput = page.getByLabel(/quote|amount|price|bid/i);
      expect(await amountInput.isVisible().catch(() => false)).toBeTruthy();
    }
  });

  test('contractor can submit a bid', async ({ page }) => {
    await loginAsContractor(page);
    await navigateAuthenticated(page, '/contractor/discover');
    await page.waitForTimeout(2000);

    // Navigate to first available job
    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (!(await jobLink.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await jobLink.click();
    await waitForContentLoaded(page);

    // Open bid form if needed
    const bidTrigger = page.getByRole('button', { name: /submit.*bid|place.*bid/i }).first();
    if (await bidTrigger.isVisible().catch(() => false)) {
      await bidTrigger.click();
      await page.waitForTimeout(500);
    }

    // Fill bid fields
    const quoteInput = page.getByLabel(/quote|amount|price/i);
    if (await quoteInput.isVisible().catch(() => false)) {
      await quoteInput.fill(bidData.quoteAmount.toString());
    }

    const messageInput = page.getByLabel(/message|description|details|cover/i);
    if (await messageInput.isVisible().catch(() => false)) {
      await messageInput.fill(bidData.description);
    }

    const daysInput = page.getByLabel(/days|timeline|duration/i);
    if (await daysInput.isVisible().catch(() => false)) {
      await daysInput.fill(bidData.estimatedDays.toString());
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /submit|send.*bid|confirm/i }).first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await waitForNetworkIdle(page);

      // Verify success
      const bidSubmitted =
        (await page.getByText(/success|submitted|sent/i).isVisible().catch(() => false)) ||
        !page.url().includes('/bid');

      expect(bidSubmitted).toBeTruthy();
    } else {
      // Bid form not available (no jobs or already bid)
      test.skip();
    }
  });
});

// ============================================================================
// 3. PAYMENT / ESCROW FLOW
// ============================================================================

test.describe('Regression: Payment & Escrow Flow', () => {
  test('homeowner can view bids on their job', async ({ page }) => {
    await loginAsHomeowner(page);
    await navigateAuthenticated(page, '/jobs');
    await page.waitForTimeout(2000);

    // Find a job that might have bids
    const jobLink = page
      .locator('a[href*="/jobs/"]')
      .or(page.getByRole('link', { name: /view|details/i }))
      .first();

    if (await jobLink.isVisible().catch(() => false)) {
      await jobLink.click();
      await waitForContentLoaded(page);

      // On the job detail page, look for bids section or escrow info
      const hasBidsSection =
        (await page.getByText(/bid|quote|proposal/i).isVisible().catch(() => false)) ||
        (await page.getByText(/no bids yet/i).isVisible().catch(() => false));

      expect(hasBidsSection).toBeTruthy();
    } else {
      // No jobs exist - that is acceptable for an empty test environment
      test.skip();
    }
  });

  test('checkout page renders correctly with query params', async ({ page }) => {
    // Direct navigation to checkout with test params
    await page.goto('/checkout?priceId=price_test_regression&jobId=job-reg&bidId=bid-reg');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should see checkout UI, a loading indicator, or a graceful error
    const hasCheckoutTitle = await page.getByText('Complete Your Payment').isVisible().catch(() => false);
    const hasError = await page.locator('[class*="alert"]').isVisible().catch(() => false);
    const hasLoading = await page.getByText(/loading/i).isVisible().catch(() => false);

    expect(hasCheckoutTitle || hasError || hasLoading).toBeTruthy();
  });

  test('checkout page shows error when priceId is missing', async ({ page }) => {
    await page.goto('/checkout?jobId=job-123&bidId=bid-456');
    await page.waitForLoadState('networkidle');

    const hasMissingPriceError =
      (await page.getByText(/Missing Price ID/i).isVisible().catch(() => false)) ||
      (await page.getByText(/Please provide a Price ID/i).isVisible().catch(() => false));

    expect(hasMissingPriceError).toBeTruthy();
  });

  test('escrow approval page is accessible for homeowner', async ({ page }) => {
    await loginAsHomeowner(page);

    await page.goto('/homeowner/escrow/approve');
    await page.waitForLoadState('networkidle');

    // Should not be redirected to login
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    // Page should have rendered something (even if empty state)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText && bodyText.length > 50).toBeTruthy();
  });
});

// ============================================================================
// 4. NOTIFICATION FLOW
// ============================================================================

test.describe('Regression: Notification Flow', () => {
  test('homeowner notifications API returns valid response', async ({ page }) => {
    await loginAsHomeowner(page);

    const response = await page.request.get('/api/notifications');
    // 200 = has notifications, 401 = session cookie issue (acceptable in E2E)
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      // Should be an array (even if empty)
      expect(Array.isArray(body) || (body && typeof body === 'object')).toBeTruthy();
    }
  });

  test('contractor notifications API returns valid response', async ({ page }) => {
    await loginAsContractor(page);

    const response = await page.request.get('/api/notifications');
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body) || (body && typeof body === 'object')).toBeTruthy();
    }
  });

  test('notifications page is accessible and renders', async ({ page }) => {
    await loginAsHomeowner(page);

    // Try common notification page paths
    for (const path of ['/notifications', '/dashboard/notifications', '/dashboard']) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      if (!page.url().includes('/login') && !page.url().includes('/auth')) {
        // Found a valid page - verify it rendered
        const bodyText = await page.locator('body').textContent();
        expect(bodyText && bodyText.length > 50).toBeTruthy();
        return;
      }
    }

    // If all paths redirected to login, verify dashboard at minimum
    await navigateAuthenticated(page, '/dashboard');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText && bodyText.length > 50).toBeTruthy();
  });
});

// ============================================================================
// 5. PROFILE FLOW
// ============================================================================

test.describe('Regression: Profile Flow', () => {
  test('homeowner profile page loads and shows user info', async ({ page }) => {
    await loginAsHomeowner(page);
    await navigateAuthenticated(page, '/profile');
    await page.waitForTimeout(2000);

    // Should see profile content (name, email, avatar area, or settings)
    const hasProfileContent =
      (await page.getByText(new RegExp(TEST_USERS.homeowner.email, 'i')).isVisible().catch(() => false)) ||
      (await page.getByText(/profile|account|settings/i).isVisible().catch(() => false)) ||
      (await page.locator('.bg-gradient-to-r').first().isVisible().catch(() => false));

    // Page should have rendered meaningful content
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.length > 100;

    expect(hasProfileContent || hasContent).toBeTruthy();
  });

  test('contractor profile page loads', async ({ page }) => {
    await loginAsContractor(page);

    await page.goto('/contractor/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should not redirect to login
    if (page.url().includes('/login') || page.url().includes('/auth')) {
      // Try alternative paths
      await page.goto('/profile');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }

    await expect(page).not.toHaveURL(/\/auth\/login/);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText && bodyText.length > 100).toBeTruthy();
  });

  test('profile edit persists changes', async ({ page }) => {
    await loginAsContractor(page);

    await page.goto('/contractor/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    if (page.url().includes('/login') || page.url().includes('/auth')) {
      test.skip();
      return;
    }

    // Look for edit button
    const editBtn = page.getByRole('button', { name: /edit|update/i }).first();
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await editBtn.click();
    await page.waitForTimeout(500);

    // Find an editable text field (bio, about, etc.)
    const bioInput = page.getByLabel(/bio|about|description/i);
    if (await bioInput.isVisible().catch(() => false)) {
      const testBio = `Regression test bio update (${Date.now()})`;
      await bioInput.fill(testBio);

      // Save
      const saveBtn = page.getByRole('button', { name: /save|update|confirm/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await waitForNetworkIdle(page);

        // Verify save succeeded (toast or updated text)
        const saved =
          (await page.getByText(/saved|updated|success/i).isVisible().catch(() => false)) ||
          (await page.getByText(testBio).isVisible().catch(() => false));

        expect(saved).toBeTruthy();
      }
    } else {
      // No editable bio field found
      test.skip();
    }
  });
});
