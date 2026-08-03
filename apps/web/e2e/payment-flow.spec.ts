/**
 * Payment Flow E2E Tests
 *
 * Tests the critical revenue-generating journey: the /checkout page renders,
 * validates its inputs, and the return page handles session status.
 *
 * /checkout is a PROTECTED route, so each test mints a real homeowner session
 * first (establishSessionInContext). Without the E2E auth fixture the endpoint
 * is unreachable and the test skips with an actionable reason — previously
 * these ran unauthenticated, landed on /login, and passed vacuously because the
 * assertions OR-ed together "title | error | loading".
 *
 * The checkout header ("Complete your payment") renders whenever priceId is
 * present, OUTSIDE the Stripe component + ErrorBoundary, so it is deterministic
 * regardless of whether Stripe test keys are configured.
 */

import { test, expect } from './fixtures';
import { establishSessionInContext, TEST_USERS } from './helpers/auth';

const AUTH_UNAVAILABLE =
  'E2E auth fixture unavailable — set E2E_TESTING=true + E2E_AUTH_SECRET on the ' +
  'server and runner, and seed users (npm run seed:e2e-users).';

test.describe('Payment & Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.homeowner);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test.describe('Checkout Page', () => {
    test('renders the payment UI when required params are present', async ({
      page,
    }) => {
      await page.goto(
        '/checkout?priceId=price_test&jobId=job-test&bidId=bid-test'
      );
      await page.waitForLoadState('networkidle');

      // The header renders for any present priceId (deterministic), and the
      // missing-priceId error must NOT be shown.
      await expect(page.getByText(/complete your payment/i)).toBeVisible();
      await expect(page.getByText(/missing price id/i)).toHaveCount(0);
    });

    test('shows an error when priceId is missing', async ({ page }) => {
      await page.goto('/checkout?jobId=job-123&bidId=bid-456');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/missing price id/i)).toBeVisible();
      // And it must NOT render the payment UI without a price.
      await expect(page.getByText(/complete your payment/i)).toHaveCount(0);
    });

    test('mounts the checkout component under the payment header', async ({
      page,
    }) => {
      await page.goto(
        '/checkout?priceId=price_test&jobId=job-123&bidId=bid-456'
      );
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/complete your payment/i)).toBeVisible();
      // The embedded checkout resolves to a concrete state — a Stripe iframe or
      // a visible error alert — never a silently blank card.
      const hasStripeFrame = await page
        .locator('iframe[name^="__privateStripeFrame"], iframe[src*="stripe"]')
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      const hasAlert = await page
        .locator('[class*="alert"], [role="alert"]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasStripeFrame || hasAlert).toBeTruthy();
    });
  });

  test.describe('Payment Form Validation', () => {
    test('rejects an invalid card number when Stripe is configured', async ({
      page,
    }) => {
      await page.goto(
        '/checkout?priceId=price_test&jobId=job-123&bidId=bid-456'
      );
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/complete your payment/i)).toBeVisible();

      const stripeFrame = page
        .frameLocator('iframe[name^="__privateStripeFrame"]')
        .first();
      const cardNumberField = stripeFrame.locator(
        '[data-elements-stable-field-name="cardNumber"]'
      );
      const stripeReady = await cardNumberField
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      // Stripe test keys aren't guaranteed in CI; when the iframe never mounts
      // the page must still show a graceful config error rather than nothing.
      if (!stripeReady) {
        await expect(
          page.locator('[class*="alert"], [role="alert"]').first()
        ).toBeVisible();
        return;
      }

      await cardNumberField.fill('1234 5678 9012');
      await expect(
        stripeFrame.locator('text=/incomplete|invalid/i')
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Payment Confirmation', () => {
    test('return page surfaces an error for an invalid session', async ({
      page,
    }) => {
      // The return page reads ?session_id and calls /api/payments/session-status.
      // An invalid session must resolve to the verification-error card, not a
      // blank page (the old test only asserted `body` was visible).
      await page.goto('/checkout/return?session_id=cs_test_invalid_123');
      await expect(
        page.getByText(/payment verification error|no session id/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Payment Flow - User Journey', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.homeowner);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test('checkout navigation lands on the payment page', async ({ page }) => {
    await page.goto(
      '/checkout?priceId=price_test_123&jobId=job-test&bidId=bid-test'
    );
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/checkout/);
    await expect(page.getByText(/complete your payment/i)).toBeVisible();
  });
});
