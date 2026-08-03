/**
 * Job Posting Flow E2E Tests
 *
 * Core homeowner journey: reach /jobs/create, see the wizard, find its controls.
 *
 * /jobs/create is protected, so each test mints a real homeowner session first.
 * Without the E2E auth fixture the test skips with an actionable reason. The
 * homeowner's two test properties are seeded by global-setup.ts.
 *
 * Previously these self-skipped on a login redirect and OR-ed their assertions
 * together ("form section OR heading OR ..."), so they passed even on /login.
 * Now the wizard-loaded assertion is hard (`[data-testid="job-create-form"]`),
 * and only genuinely variable UI (multi-step vs single-page) stays as an OR.
 */

import { test, expect } from './fixtures';
import { establishSessionInContext, TEST_USERS } from './helpers/auth';

const AUTH_UNAVAILABLE =
  'E2E auth fixture unavailable — set E2E_TESTING=true + E2E_AUTH_SECRET on the ' +
  'server and runner, and seed users (npm run seed:e2e-users).';

/** Reach /jobs/create authenticated and assert the wizard mounted. */
async function openJobWizard(page: import('@playwright/test').Page) {
  await page.goto('/jobs/create');
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login|\/login/);
  await expect(page.locator('[data-testid="job-create-form"]')).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Job Posting Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.homeowner);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test.describe('Job Creation Page Access', () => {
    test('job creation page loads for an authenticated homeowner', async ({
      page,
    }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('networkidle');
      // Auth is guaranteed, so it must stay on the wizard, not redirect to login.
      await expect(page).toHaveURL(/\/jobs\/create/);
    });
  });

  test.describe('Job Creation Form - UI Elements', () => {
    test('displays the first step of the wizard', async ({ page }) => {
      await openJobWizard(page);
      await expect(page.getByText('What do you need done?')).toBeVisible();
    });

    test('exposes photo upload capability', async ({ page }) => {
      await openJobWizard(page);
      // Multi-step (a Photos step in the progress bar) or single-page (the
      // upload control inline) both satisfy this — but the wizard must be up.
      const hasPhotosStep = await page
        .getByText('Photos')
        .isVisible()
        .catch(() => false);
      const hasFileInput = await page
        .locator('input#photo-upload')
        .isVisible()
        .catch(() => false);
      const hasUploadText = await page
        .getByText(/Add photos of your project|Click to upload|drag and drop/i)
        .isVisible()
        .catch(() => false);
      expect(hasPhotosStep || hasFileInput || hasUploadText).toBeTruthy();
    });

    test('exposes urgency / timeline selection', async ({ page }) => {
      await openJobWizard(page);
      const hasTimelineStep = await page
        .getByText('Timeline')
        .isVisible()
        .catch(() => false);
      const hasUrgencyLabel = await page
        .getByText('When do you need this done?')
        .isVisible()
        .catch(() => false);
      const hasUrgencyOption = await page
        .getByText(/Flexible|Soon|Urgent|Emergency/i)
        .isVisible()
        .catch(() => false);
      expect(
        hasTimelineStep || hasUrgencyLabel || hasUrgencyOption
      ).toBeTruthy();
    });
  });

  test.describe('Job Creation Form - Navigation', () => {
    test('has a next/submit control', async ({ page }) => {
      await openJobWizard(page);
      const hasNextButton = await page
        .locator('[data-testid="next-button"]')
        .isVisible()
        .catch(() => false);
      const hasSubmitButton =
        (await page.locator('[data-testid="submit-button"]').count()) > 0;
      const hasAnySubmitButton = await page
        .getByRole('button', { name: /post.*job|create.*job|submit|next/i })
        .isVisible()
        .catch(() => false);
      expect(
        hasNextButton || hasSubmitButton || hasAnySubmitButton
      ).toBeTruthy();
    });

    test('has back/cancel navigation', async ({ page }) => {
      await openJobWizard(page);
      const hasCancelButtonTestId = await page
        .locator('[data-testid="cancel-button"]')
        .isVisible()
        .catch(() => false);
      const hasBackButtonTestId =
        (await page.locator('[data-testid="back-button"]').count()) > 0;
      const hasCancelButton = await page
        .getByRole('button', { name: /cancel/i })
        .isVisible()
        .catch(() => false);
      const hasBackToJobs = await page
        .getByText(/back to jobs/i)
        .isVisible()
        .catch(() => false);
      expect(
        hasCancelButtonTestId ||
          hasBackButtonTestId ||
          hasCancelButton ||
          hasBackToJobs
      ).toBeTruthy();
    });
  });
});

test.describe('Job Listing Page', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.homeowner);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test('job listings page renders a concrete state', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    // Jobs heading, a table/cards list, or an explicit empty/CTA state — never
    // a blank page (the old test only asserted `body` was visible).
    const hasJobsHeading = await page
      .getByRole('heading', { name: /job|project/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasTableOrCards =
      (await page.locator('table, [class*="card"]').count()) > 0;
    const hasEmptyState = await page
      .getByText(/no.*job|no.*result|create.*job|post.*job/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasJobsHeading || hasTableOrCards || hasEmptyState).toBeTruthy();
  });
});
