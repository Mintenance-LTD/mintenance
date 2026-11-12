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
import { fixtureJob, submitAndVerifyBid } from './helpers/bid-journey';

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
    expect(authed, AUTH_UNAVAILABLE).toBe(true);
  });

  test('contractor can access job discovery page', async ({ page }) => {
    await page.goto('/contractor/discover');
    await page.waitForLoadState('domcontentloaded');

    // A real session must NOT be bounced to login, and the discover shell must
    // render (previously this only asserted `body` was visible, which is true
    // even on the login page).
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('contractor can view job details from discovery', async ({ page }) => {
    await page.goto('/contractor/discover');
    const jobLink = page.locator('[data-job-id="' + fixtureJob() + '"]');
    await expect(jobLink).toBeVisible();
    await jobLink.click();
    await expect(page).toHaveURL(
      '/contractor/bid/' + fixtureJob() + '/details'
    );
    await expect(page.getByText('Synthetic BID fixture').first()).toBeVisible();
  });

  test('contractor can access bid submission form', async ({ page }) => {
    // Use the isolated fixture instead of accidentally following the payouts banner.
    expect(
      process.env.E2E_BID_JOB_ID,
      'bootstrap-e2e must seed a bid job'
    ).toBeTruthy();
    await page.goto(`/contractor/jobs/${process.env.E2E_BID_JOB_ID}/view`);
    await page.waitForLoadState('domcontentloaded');

    // Both desktop and mobile layouts expose the same navigation action.
    const bidButton = page
      .getByRole('button', {
        name: /submit.*bid|place.*bid|bid.*now/i,
      })
      .first();
    await bidButton.click();
    await expect(page).toHaveURL(
      `/contractor/bid/${process.env.E2E_BID_JOB_ID}`
    );
    await expect(page.getByLabel(/quote|amount|price/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByLabel(/proposal description/i)).toBeVisible();
    await expect(page.getByLabel(/estimated duration/i)).toBeVisible();
    await expect(page.getByLabel(/proposed start date/i)).toBeVisible();
  });

  test('contractor can submit a bid', async ({ page }) => {
    await submitAndVerifyBid(page, 'SUBMIT_BID');
  });

  test('contractor can view their submitted bids', async ({ page }) => {
    await page.goto('/contractor/quotes');
    await page.waitForLoadState('domcontentloaded');
    // Auth is guaranteed by beforeEach, so a login redirect here is a real
    // failure (broken session handling), not a reason to skip.
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Quotes', exact: true })
    ).toBeVisible();
  });

  test('availability saves atomically and invalid times preserve the saved schedule', async ({
    page,
  }) => {
    const csrf = await page.request.get('/api/csrf');
    expect(csrf.ok()).toBe(true);
    const { token } = await csrf.json();
    const availability = [1, 2].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    const saved = await page.request.put('/api/contractor/availability', {
      headers: { 'X-CSRF-Token': token },
      data: { availability },
    });
    expect(saved.ok(), await saved.text()).toBe(true);
    const invalid = await page.request.put('/api/contractor/availability', {
      headers: { 'X-CSRF-Token': token },
      data: { availability: [{ ...availability[0], endTime: '08:00' }] },
    });
    expect(invalid.status()).toBe(400);
    const persisted = await page.request.get('/api/contractor/availability');
    const body = await persisted.json();
    expect(body.availability).toHaveLength(2);
    expect(
      body.availability.map((slot: { dayOfWeek: number }) => slot.dayOfWeek)
    ).toEqual([1, 2]);
    const stats = await page.request.get('/api/contractor/appointments/stats');
    expect(stats.ok()).toBe(true);
    expect((await stats.json()).stats.availableHours).toBe(16);
  });

  test('contractor can view their profile', async ({ page }) => {
    await page.goto('/contractor/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(
      // .first(): the profile page legitimately matches several elements
      // (nav link, headings, completion widget) — any one visible is enough.
      page.getByText(/profile|about|skill|experience/i).first()
    ).toBeVisible();
  });

  test('contractor can edit their profile', async ({ page }) => {
    await page.goto('/contractor/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    const editButton = page.getByRole('button', { name: /edit|update/i });
    // The edit affordance is a UI-variant/feature gate, not an auth gate.
    await expect(editButton).toBeVisible();

    await editButton.click();
    const bioInput = page.getByLabel(/bio|about|description/i);
    await expect(bioInput).toBeVisible();
    // A fresh value proves this save persisted, rather than a previous run's bio.
    const updatedBio = `Updated bio for testing purposes ${Date.now()}`;
    await bioInput.fill(updatedBio);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    // The bio also contains "Updated"; only the status notice confirms success.
    // Observe it immediately, before a network-idle wait can outlast the toast.
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /^Profile updated successfully!?$/ })
    ).toBeVisible();
    await expect(bioInput).not.toBeVisible();
    await expect(
      page.getByText(updatedBio, { exact: true }).filter({ visible: true })
    ).toHaveCount(1);

    // Reload from the server so optimistic/local form state cannot pass the test.
    await page.reload();
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
    await expect(
      page.getByText(updatedBio, { exact: true }).filter({ visible: true })
    ).toHaveCount(1);
  });
});

test.describe('Contractor Job Filtering', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.contractor);
    expect(authed, AUTH_UNAVAILABLE).toBe(true);
    await page.goto('/contractor/discover');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
  });

  test('contractor can filter jobs by category and radius', async ({
    page,
  }) => {
    const plumbing = page.getByRole('button', { name: /^plumbing$/i });
    await plumbing.click();
    await expect(plumbing).toHaveAttribute('aria-pressed', 'true');
    const radius = page.getByRole('button', { name: '3 mi', exact: true });
    await radius.click();
    await expect(radius).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Synthetic BID fixture').first()).toBeVisible();
  });
});
