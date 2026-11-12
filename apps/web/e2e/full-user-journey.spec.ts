/**
 * Full User Journey E2E Test: Homeowner & Contractor Flow
 *
 * Covers protected routes and the real disposable marketplace hand-off.
 * Provider payout/refund requires the separately configured Stripe test environment.
 *
 * Prerequisites:
 * - Test users must exist in the database (see helpers/auth.ts TEST_USERS)
 * - Dev server running on localhost:3000
 */

import { test, expect } from './fixtures';
import { submitAndVerifyBid } from './helpers/bid-journey';
import {
  loginAsHomeowner,
  establishSessionInContext,
  TEST_USERS,
  clearAuth,
} from './helpers/auth';

import {
  openJobWizard,
  fillJobWizardToReview,
  submitJobWizard,
} from './helpers/job-wizard';

// ---- Security regression tests (Phase 2 fixes) ----

test.describe('Security: Auth Bypass Regression', () => {
  test('unauthenticated user cannot access /contractor/dashboard-enhanced', async ({
    page,
  }) => {
    await clearAuth(page);
    await page.goto('/contractor/dashboard-enhanced');
    await page.waitForLoadState('networkidle');

    // Should be redirected to /login
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user cannot access /contractor/settings', async ({
    page,
  }) => {
    await clearAuth(page);
    await page.goto('/contractor/settings');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
  });

  test('/contractors listing stays public for crawlers', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/contractors');
    await page.waitForLoadState('networkidle');

    // This assertion was inverted on purpose. The contractor directory used to
    // be auth-gated, but audit F1/F2 deliberately made it public: sitemap.ts
    // advertises these pages to search engines, and while they redirected to
    // /login the per-page SEO metadata was never served. See the rationale on
    // PUBLIC_PAGE_ROUTES in middleware/public-routes.ts.
    expect(page.url()).not.toContain('/login');
  });

  test('unauthenticated user cannot access /dashboard', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/login');
  });

  test('public contractor profile (UUID) is still accessible', async ({
    page,
  }) => {
    // A UUID-formatted path should remain public per middleware
    await clearAuth(page);
    await page.goto('/contractor/00000000-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');

    // Should NOT be redirected to login (the page may 404 but should not force login)
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('landing page links expose public guides and the sign-in entry point', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(
      nav.getByRole('link', { name: 'For homeowners', exact: true })
    ).toHaveAttribute('href', '/for-homeowners');
    await expect(
      nav.getByRole('link', { name: 'For tradespeople', exact: true })
    ).toHaveAttribute('href', '/for-contractors');
    await expect(
      nav.getByRole('link', { name: 'Sign in', exact: true })
    ).toHaveAttribute('href', '/login');
  });

  test('landing page does not contain "Browse Contractors" button', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const browseButton = page.getByRole('link', {
      name: /Browse Contractors/i,
    });
    const isVisible = await browseButton.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });
});

// ---- Full User Journey ----

// This environment deliberately has no live Stripe credentials. Test the
// marketplace hand-off and its payout-readiness guard; provider settlement is
// a separate test-mode acceptance requirement, never implied by this test.
test('homeowner posts, contractor bids, homeowner reads bid and payout guard prevents acceptance', async ({
  page,
}) => {
  test.setTimeout(180000);
  expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
    true
  );
  expect(await openJobWizard(page)).toBe(true);
  await fillJobWizardToReview(page, {
    title: 'Synthetic marketplace journey ' + Date.now(),
    description:
      'Synthetic kitchen tap repair for browser acceptance testing. Replace the leaking tap and check the plumbing connections.',
    category: 'plumbing',
    urgency: 'medium',
  });
  await submitJobWizard(page);
  const id = new URL(page.url()).pathname.split('/')[2];
  expect(id).toMatch(/^[0-9a-f-]{36}$/);

  expect(await establishSessionInContext(page, TEST_USERS.contractor)).toBe(
    true
  );
  await submitAndVerifyBid(page, 'JOURNEY', id);
  expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
    true
  );
  const bidsResponse = await page.request.get('/api/jobs/' + id + '/bids');
  expect(bidsResponse.ok()).toBe(true);
  const { bids } = await bidsResponse.json();
  expect(bids).toHaveLength(1);
  expect(Number(bids[0].amount)).toBe(180.6);
  const csrf = await page.request.get('/api/csrf');
  expect(csrf.ok()).toBe(true);
  const { token } = await csrf.json();
  const acceptance = await page.request.post(
    '/api/jobs/' + id + '/bids/' + bids[0].id + '/accept',
    {
      headers: { 'X-CSRF-Token': token },
      data: {},
    }
  );
  expect(acceptance.status()).toBe(403);
  expect(await acceptance.text()).toContain('payment account setup');
  const stillPending = await page.request.get('/api/jobs/' + id + '/bids');
  expect((await stillPending.json()).bids[0].status).toBe('pending');
  for (const account of [TEST_USERS.homeowner, TEST_USERS.contractor]) {
    expect(await establishSessionInContext(page, account)).toBe(true);
    const notifications = await page.request.get('/api/notifications');
    expect(notifications.ok()).toBe(true);
  }
});

test.describe('Profile Image Display', () => {
  test('Profile page loads and shows avatar area', async ({ page }) => {
    await loginAsHomeowner(page);

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);

    await page.waitForTimeout(3000);

    // The profile hero header should be visible
    const profileArea = page.locator('.bg-gradient-to-r').first();
    const hasProfile = await profileArea.isVisible().catch(() => false);

    // Page should have loaded (not stuck on loading)
    const bodyText = await page.textContent('body');
    const isNotLoading =
      bodyText && !bodyText.includes('Loading...') && bodyText.length > 100;

    expect(hasProfile || isNotLoading).toBeTruthy();
  });
});

// ---- Early Access / Founding Members ----

test.describe('Subscription Status API', () => {
  test('subscription status endpoint returns early access info', async ({
    page,
  }) => {
    await loginAsHomeowner(page);

    const response = await page.request.get('/api/subscriptions/status');

    if (response.status() === 200) {
      const data = await response.json();
      // Should include earlyAccess field
      expect(data).toHaveProperty('earlyAccess');
      expect(data.earlyAccess).toHaveProperty('eligible');
    }
    expect(response.status()).toBe(200);
  });
});
