/**
 * Authenticated Contractor Flow E2E Tests
 *
 * Tests contractor-specific journeys:
 * - Discover jobs → View job details → Submit bid
 *
 * IMPORTANT: These tests use Playwright's storage state feature.
 * The contractor is authenticated once in global-setup.ts and the
 * session is reused across all tests in this file.
 *
 * No manual login is needed - the session is pre-loaded from
 * e2e/.auth/contractor.json
 */

import { test, expect } from './fixtures';
import { establishSessionInContext, TEST_USERS } from './helpers/auth';
import { createTestBid, waitForNetworkIdle } from './helpers/test-data';

const AUTH_UNAVAILABLE =
  'E2E auth fixture unavailable — set E2E_TESTING=true + E2E_AUTH_SECRET on the ' +
  'server and runner, and seed users (npm run seed:e2e-users).';

// Mint a real contractor session into this context before each test. When the
// fixture is not configured (no E2E_AUTH_SECRET, or a server without
// E2E_TESTING) the endpoint is unreachable and we skip with an actionable
// reason — instead of the old pattern where a login redirect made every
// assertion below silently pass. Once the fixture is live these run for real.
test.describe('Authenticated Contractor Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.contractor);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test('contractor can access job discovery page', async ({ page }) => {
    await page.goto('/contractor/discover');
    await page.waitForLoadState('networkidle');

    // A real session must NOT be bounced to login, and the discover shell must
    // render (previously this only asserted `body` was visible, which is true
    // even on the login page).
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('contractor can view job details', async ({ page }) => {
    await page.goto('/contractor/discover');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    // Find first job card or link
    const jobLink = page
      .getByRole('link', { name: /view.*detail|details|see.*job/i })
      .first();
    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Job discovery depends on seeded jobs, which the e2e seed does not create.
    // Skip only for that data gap (explicit), but when a job IS present the
    // navigation + details render are asserted for real.
    const hasLink = await jobLink.isVisible().catch(() => false);
    const hasCard = !hasLink && (await jobCard.isVisible().catch(() => false));
    test.skip(!hasLink && !hasCard, 'No seeded jobs on the discover feed');

    if (hasLink) {
      await jobLink.click();
    } else {
      await jobCard.click();
    }
    await expect(page).toHaveURL(/\/jobs\/|\/contractor\/jobs\//);
    await expect(page.getByText(/description|details|budget/i)).toBeVisible();
  });

  test('contractor can access bid submission form', async ({ page }) => {
    // Navigate to a job (this assumes jobs exist)
    await page.goto('/contractor/discover');
    await page.waitForLoadState('networkidle');

    // Click on first available job. Both locators are scoped to the
    // #main-content landmark: unscoped, `getByRole('link').first()` resolves to
    // the layout's sr-only "Skip to content" link, which sits outside the
    // viewport and makes the click retry until the test times out.
    const content = page.locator('#main-content');
    const firstJob = content.locator('[data-testid="job-card"]').first();
    const firstJobLink = content.getByRole('link').first();

    const hasJob = await firstJob.isVisible().catch(() => false);
    const hasJobLink =
      !hasJob && (await firstJobLink.isVisible().catch(() => false));
    // Data gap, not a bug: the e2e seed creates no jobs to bid on.
    test.skip(!hasJob && !hasJobLink, 'No seeded jobs on the discover feed');

    if (hasJob) {
      await firstJob.click();
    } else {
      await firstJobLink.click();
    }
    await page.waitForLoadState('networkidle');

    // From a job detail page the bid form must be reachable: either a
    // Submit/Place Bid CTA that opens it, or the form already inline.
    const bidButton = page.getByRole('button', {
      name: /submit.*bid|place.*bid|bid.*now/i,
    });
    if (await bidButton.isVisible().catch(() => false)) {
      await bidButton.click();
    }
    await expect(page.getByLabel(/quote|amount|price/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('contractor can submit a bid', async ({ page }) => {
    const testBid = createTestBid();

    // Navigate to discover page
    await page.goto('/contractor/discover');
    await page.waitForLoadState('networkidle');

    // Find and click first job
    const firstJobLink = page.locator('a[href*="/jobs/"]').first();
    // Data gap, not a bug: the e2e seed creates no jobs to bid on.
    test.skip(
      !(await firstJobLink.isVisible().catch(() => false)),
      'No seeded jobs on the discover feed'
    );

    await firstJobLink.click();
    await page.waitForLoadState('networkidle');

    // Click bid button
    const bidButton = page.getByRole('button', {
      name: /submit.*bid|place.*bid/i,
    });
    if (await bidButton.isVisible().catch(() => false)) {
      await bidButton.click();
      await page.waitForTimeout(500);
    }

    // Fill bid form
    const quoteInput = page.getByLabel(/quote|amount|price/i);
    if (await quoteInput.isVisible().catch(() => false)) {
      await quoteInput.fill(testBid.quoteAmount.toString());
    }

    const descriptionInput = page.getByLabel(/description|details|message/i);
    if (await descriptionInput.isVisible().catch(() => false)) {
      await descriptionInput.fill(testBid.description);
    }

    const daysInput = page.getByLabel(/days|timeline|duration/i);
    if (await daysInput.isVisible().catch(() => false)) {
      await daysInput.fill(testBid.estimatedDays.toString());
    }

    // Submit bid
    const submitButton = page.getByRole('button', {
      name: /submit|send.*bid/i,
    });
    await submitButton.click();

    await waitForNetworkIdle(page);

    // Should see success message or redirect
    const successMessage = await page
      .getByText(/success|submitted|sent/i)
      .isVisible()
      .catch(() => false);
    const redirectedAway = !page.url().includes('/bid');

    expect(successMessage || redirectedAway).toBeTruthy();
  });

  test('contractor can view their submitted bids', async ({ page }) => {
    await page.goto('/contractor/dashboard');
    await page.waitForLoadState('networkidle');
    // Auth is guaranteed by beforeEach, so a login redirect here is a real
    // failure (broken session handling), not a reason to skip.
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('contractor can view their profile', async ({ page }) => {
    await page.goto('/contractor/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(
      // .first(): the profile page legitimately matches several elements
      // (nav link, headings, completion widget) — any one visible is enough.
      page.getByText(/profile|about|skill|experience/i).first()
    ).toBeVisible();
  });

  test('contractor can edit their profile', async ({ page }) => {
    await page.goto('/contractor/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    const editButton = page.getByRole('button', { name: /edit|update/i });
    // The edit affordance is a UI-variant/feature gate, not an auth gate.
    test.skip(
      !(await editButton.isVisible().catch(() => false)),
      'No edit affordance on /contractor/profile in this UI variant'
    );

    await editButton.click();
    const bioInput = page.getByLabel(/bio|about|description/i);
    await expect(bioInput).toBeVisible();
    await bioInput.fill('Updated bio for testing purposes');
    await page.getByRole('button', { name: /save|update/i }).click();
    await waitForNetworkIdle(page);
    await expect(page.getByText(/saved|updated/i)).toBeVisible();
  });
});

test.describe('Contractor Job Filtering', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.contractor);
    test.skip(!authed, AUTH_UNAVAILABLE);
    await page.goto('/contractor/discover');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
  });

  test('contractor can filter jobs by category', async ({ page }) => {
    const categoryFilter = page.getByLabel(/category|type/i);
    // The filter control is a UI-variant gate; skip explicitly when absent.
    test.skip(
      !(await categoryFilter.isVisible().catch(() => false)),
      'No category filter control on the discover page in this UI variant'
    );

    await categoryFilter.selectOption('plumbing');
    await waitForNetworkIdle(page);

    // After filtering, the feed must resolve to a concrete state: matching
    // jobs OR an explicit empty-state — never a blank page.
    const jobsPresent = await page
      .getByText(/job|project/i)
      .first()
      .isVisible()
      .catch(() => false);
    const noResultsMessage = await page
      .getByText(/no.*job|no.*result|nothing/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(jobsPresent || noResultsMessage).toBeTruthy();
  });

  test('contractor can search jobs by location', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search|location|postcode/i);
    test.skip(
      !(await searchInput.isVisible().catch(() => false)),
      'No location search control on the discover page in this UI variant'
    );

    await searchInput.fill('London');
    const searchButton = page.getByRole('button', { name: /search/i });
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click();
    }
    await waitForNetworkIdle(page);

    // The search must resolve to results or an explicit empty-state — assert a
    // concrete landmark rather than "body has any text" (true even on /login).
    const jobsPresent = await page
      .getByText(/job|project/i)
      .first()
      .isVisible()
      .catch(() => false);
    const noResultsMessage = await page
      .getByText(/no.*job|no.*result|nothing/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(jobsPresent || noResultsMessage).toBeTruthy();
  });
});
