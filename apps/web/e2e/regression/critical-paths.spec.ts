/**
 * Critical Paths Regression E2E Tests
 *
 * The five most important journeys: job creation (homeowner), contractor bid,
 * payment/escrow, notifications, profile.
 *
 * All target routes are protected, so each test first mints a real session via
 * establishSessionInContext and skips with an actionable reason when the E2E
 * auth fixture is not configured — instead of UI login (which throws and reds
 * CI) or letting a login redirect make body-length assertions pass vacuously.
 */

import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { establishSessionInContext, TEST_USERS } from '../helpers/auth';
import {
  createTestJob,
  createTestBid,
  waitForNetworkIdle,
} from '../helpers/test-data';
import {
  openJobWizard,
  fillJobWizardToReview,
  submitJobWizard,
} from '../helpers/job-wizard';

const AUTH_UNAVAILABLE =
  'E2E auth fixture unavailable — set E2E_TESTING=true + E2E_AUTH_SECRET on the ' +
  'server and runner, and seed users (npm run seed:e2e-users).';

type Role = { email: string; password: string; role: string };

/** Mint a session for `user`; skip the test if the fixture is unavailable. */
async function auth(page: Page, user: Role): Promise<void> {
  const ok = await establishSessionInContext(page, user);
  test.skip(!ok, AUTH_UNAVAILABLE);
}

/** Wait for the page to leave a loading state (skeleton / spinner gone). */
async function waitForContentLoaded(
  page: Page,
  timeout = 10000
): Promise<void> {
  await expect(page.locator('body')).toBeVisible({ timeout });
  const spinner = page
    .locator('[data-testid="loading"], .animate-spin, .animate-pulse')
    .first();
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
    title: 'Regression: Leaking tap',
    description:
      'Kitchen tap leaking badly, need a qualified plumber urgently. ' +
      'The leak started two days ago and is getting worse. Water pooling on the floor.',
    category: 'plumbing',
    budget: 250,
    urgency: 'high',
    postcode: 'SW1A 1AA',
  });

  test('homeowner can navigate to job creation page', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    await navigateAuthenticated(page, '/jobs/create');
    await expect(
      page
        .locator('[data-testid="job-create-form"]')
        .or(page.getByText(/What do you need done/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('homeowner can fill and submit job form', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    expect(await openJobWizard(page)).toBeTruthy();

    await fillJobWizardToReview(page, {
      title: jobData.title,
      description: jobData.description,
      category: 'plumbing',
      urgency: 'medium',
    });
    await submitJobWizard(page);

    const succeeded =
      (await page
        .getByText(/success|created|posted/i)
        .first()
        .isVisible()
        .catch(() => false)) || /\/jobs\/[a-z0-9-]+/.test(page.url());
    expect(succeeded).toBeTruthy();
  });

  test('jobs list renders a concrete state', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    await navigateAuthenticated(page, '/jobs');

    const hasJobCards =
      (await page.locator('[data-testid="job-card"]').count()) > 0 ||
      (await page.locator('table tbody tr').count()) > 0;
    const hasEmptyState = await page
      .getByText(/no.*job|no.*result|create.*job|post.*job/i)
      .first()
      .isVisible()
      .catch(() => false);
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
    await auth(page, TEST_USERS.contractor);
    await navigateAuthenticated(page, '/contractor/discover');

    // Job cards, an explicit empty state, or the discover shell — not a blank
    // page or a login redirect (asserted by navigateAuthenticated).
    const hasCards =
      (await page.locator('[data-testid="job-card"]').count()) > 0;
    const hasEmptyState = await page
      .getByText(/no.*job|no.*available/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasShell = await page
      .locator('#main-content')
      .isVisible()
      .catch(() => false);
    expect(hasCards || hasEmptyState || hasShell).toBeTruthy();
  });

  test('contractor can view a job and access bid form', async ({ page }) => {
    await auth(page, TEST_USERS.contractor);
    await navigateAuthenticated(page, '/contractor/discover');

    const jobLink = page
      .locator('a[href*="/jobs/"]')
      .or(page.locator('[data-testid="job-card"]'))
      .first();
    // Data gap: the e2e seed creates no jobs to open.
    test.skip(
      !(await jobLink.isVisible().catch(() => false)),
      'No seeded jobs on the discover feed'
    );

    await jobLink.click();
    await waitForContentLoaded(page);
    await expect(page).toHaveURL(/\/jobs\//);

    const bidButton = page
      .getByRole('button', { name: /submit.*bid|place.*bid|bid.*now/i })
      .first();
    if (await bidButton.isVisible().catch(() => false)) {
      await bidButton.click();
      await expect(page.getByLabel(/quote|amount|price|bid/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('contractor can submit a bid', async ({ page }) => {
    await auth(page, TEST_USERS.contractor);
    await navigateAuthenticated(page, '/contractor/discover');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    test.skip(
      !(await jobLink.isVisible().catch(() => false)),
      'No seeded jobs on the discover feed'
    );

    await jobLink.click();
    await waitForContentLoaded(page);

    const bidTrigger = page
      .getByRole('button', { name: /submit.*bid|place.*bid/i })
      .first();
    if (await bidTrigger.isVisible().catch(() => false)) {
      await bidTrigger.click();
      await page.waitForTimeout(500);
    }

    const quoteInput = page.getByLabel(/quote|amount|price/i);
    // Reaching a job detail without a bid form is a real regression, not a skip.
    await expect(quoteInput).toBeVisible({ timeout: 5000 });
    await quoteInput.fill(bidData.quoteAmount.toString());

    const messageInput = page.getByLabel(/message|description|details|cover/i);
    if (await messageInput.isVisible().catch(() => false)) {
      await messageInput.fill(bidData.description);
    }
    const daysInput = page.getByLabel(/days|timeline|duration/i);
    if (await daysInput.isVisible().catch(() => false)) {
      await daysInput.fill(bidData.estimatedDays.toString());
    }

    await page
      .getByRole('button', { name: /submit|send.*bid|confirm/i })
      .first()
      .click();
    await waitForNetworkIdle(page);

    const bidSubmitted =
      (await page
        .getByText(/success|submitted|sent/i)
        .isVisible()
        .catch(() => false)) || !page.url().includes('/bid');
    expect(bidSubmitted).toBeTruthy();
  });
});

// ============================================================================
// 3. PAYMENT / ESCROW FLOW
// ============================================================================

test.describe('Regression: Payment & Escrow Flow', () => {
  test('homeowner can view bids on their job', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    await navigateAuthenticated(page, '/jobs');

    const content = page.locator('#main-content');
    const jobLink = content
      .locator('a[href*="/jobs/"]:not([href$="/jobs/create"])')
      .or(content.getByRole('link', { name: /view|details/i }))
      .first();
    // Data gap: no seeded jobs to open.
    test.skip(
      !(await jobLink.isVisible().catch(() => false)),
      'No seeded jobs to open'
    );

    await jobLink.click();
    await waitForContentLoaded(page);
    const hasBidsSection =
      (await page
        .getByText(/bid|quote|proposal/i)
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText(/no bids yet/i)
        .isVisible()
        .catch(() => false));
    expect(hasBidsSection).toBeTruthy();
  });

  test('checkout page renders the payment UI with query params', async ({
    page,
  }) => {
    await auth(page, TEST_USERS.homeowner);
    await page.goto(
      '/checkout?priceId=price_test_regression&jobId=job-reg&bidId=bid-reg'
    );
    await page.waitForLoadState('networkidle');

    // Header renders for any present priceId (deterministic); missing-price
    // error must NOT show.
    await expect(page.getByText(/complete your payment/i)).toBeVisible();
    await expect(page.getByText(/missing price id/i)).toHaveCount(0);
  });

  test('checkout page shows error when priceId is missing', async ({
    page,
  }) => {
    await auth(page, TEST_USERS.homeowner);
    await page.goto('/checkout?jobId=job-123&bidId=bid-456');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/missing price id/i)).toBeVisible();
  });

  test('escrow approval page is accessible for homeowner', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    await page.goto('/homeowner/escrow/approve');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    // Renders the app shell rather than erroring/blanking.
    await expect(page.locator('#main-content')).toBeVisible();
  });
});

// ============================================================================
// 4. NOTIFICATION FLOW
// ============================================================================

test.describe('Regression: Notification Flow', () => {
  test('homeowner notifications API returns a valid response', async ({
    page,
  }) => {
    await auth(page, TEST_USERS.homeowner);
    const response = await page.request.get('/api/notifications');
    // A real session must authenticate — no 401 tolerance any more.
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body) || typeof body === 'object').toBeTruthy();
  });

  test('contractor notifications API returns a valid response', async ({
    page,
  }) => {
    await auth(page, TEST_USERS.contractor);
    const response = await page.request.get('/api/notifications');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body) || typeof body === 'object').toBeTruthy();
  });

  test('notifications page renders authenticated', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    await navigateAuthenticated(page, '/notifications');
    // A concrete state: the notifications heading or an explicit empty state.
    const hasHeading = await page
      .getByRole('heading', { name: /notification/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no.*notification|all caught up|nothing/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasShell = await page
      .locator('#main-content')
      .isVisible()
      .catch(() => false);
    expect(hasHeading || hasEmptyState || hasShell).toBeTruthy();
  });
});

// ============================================================================
// 5. PROFILE FLOW
// ============================================================================

test.describe('Regression: Profile Flow', () => {
  test('homeowner profile page shows user info', async ({ page }) => {
    await auth(page, TEST_USERS.homeowner);
    await navigateAuthenticated(page, '/profile');
    const hasProfileContent =
      (await page
        .getByText(new RegExp(TEST_USERS.homeowner.email, 'i'))
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText(/profile|account|settings/i)
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasProfileContent).toBeTruthy();
  });

  test('contractor profile page loads', async ({ page }) => {
    await auth(page, TEST_USERS.contractor);
    await page.goto('/contractor/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(
      page.getByText(/profile|about|skill|experience/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('profile edit persists changes', async ({ page }) => {
    await auth(page, TEST_USERS.contractor);
    await page.goto('/contractor/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    const editBtn = page.getByRole('button', { name: /edit|update/i }).first();
    // Edit affordance is a UI-variant gate, not an auth gate.
    test.skip(
      !(await editBtn.isVisible().catch(() => false)),
      'No edit affordance on /contractor/profile in this UI variant'
    );
    await editBtn.click();
    await page.waitForTimeout(500);

    const bioInput = page.getByLabel(/bio|about|description/i);
    test.skip(
      !(await bioInput.isVisible().catch(() => false)),
      'No editable bio field in this profile variant'
    );
    const testBio = 'Regression test bio update';
    await bioInput.fill(testBio);
    await page
      .getByRole('button', { name: /save|update|confirm/i })
      .first()
      .click();
    await waitForNetworkIdle(page);

    await expect(
      page.getByText(/saved|updated|success/i).or(page.getByText(testBio))
    ).toBeVisible({ timeout: 10000 });
  });
});
