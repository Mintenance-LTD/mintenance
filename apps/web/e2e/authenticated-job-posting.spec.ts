/**
 * Authenticated Job Posting Flow E2E Tests
 *
 * Tests the complete job posting journey for authenticated homeowners.
 *
 * IMPORTANT: These tests use Playwright's storage state feature.
 * The homeowner is authenticated once in global-setup.ts and the
 * session is reused across all tests in this file.
 *
 * No manual login is needed - the session is pre-loaded from
 * e2e/.auth/homeowner.json
 */

import { test, expect } from './fixtures';
import {
  createTestJob,
  fillForm,
  waitForNetworkIdle,
} from './helpers/test-data';
import {
  openJobWizard,
  completeDetailsStep,
  completePhotosStep,
  completeTimelineStep,
  fillJobWizardToReview,
  submitJobWizard,
} from './helpers/job-wizard';
import { establishSessionInContext, TEST_USERS } from './helpers/auth';

const AUTH_UNAVAILABLE =
  'E2E auth fixture unavailable — set E2E_TESTING=true + E2E_AUTH_SECRET on the ' +
  'server and runner, and seed users (npm run seed:e2e-users).';

test.describe('Authenticated Job Posting Flow', () => {
  // Re-mint a real homeowner session into this context (storageState restores
  // the app JWT but not the Supabase half; see establishSessionInContext). Skip
  // with an actionable reason when the fixture is not configured, rather than
  // letting a login redirect make the assertions below pass vacuously.
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.homeowner);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test('homeowner can access job creation page', async ({ page }) => {
    // openJobWizard navigates to /jobs/create and waits for the wizard to mount;
    // it returns false on a login redirect or if the wizard never appears. Auth
    // is guaranteed by beforeEach and properties are seeded, so this must open.
    expect(await openJobWizard(page)).toBeTruthy();
    await expect(page).toHaveURL(/\/jobs\/create/);
  });

  test('homeowner can create a basic job', async ({ page }) => {
    const testJob = createTestJob();

    expect(await openJobWizard(page)).toBeTruthy();

    await fillJobWizardToReview(page, {
      title: testJob.title,
      description: testJob.description,
      category: testJob.category,
      urgency: 'medium',
    });

    await submitJobWizard(page);

    // Success is either a confirmation message or a redirect off the wizard.
    const hasMessage = await page
      .getByText(/success|created|posted/i)
      .first()
      .isVisible()
      .catch(() => false);
    const leftWizard = !page.url().includes('/jobs/create');

    expect(hasMessage || leftWizard).toBeTruthy();
  });

  test('homeowner can save job as draft', async ({ page }) => {
    // Verify we can access job creation page
    await page.goto('/jobs/create');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Look for "Save as draft" button
    const draftButton = page.getByRole('button', {
      name: /save.*draft|draft/i,
    });
    // Save-as-draft is an optional feature, not an auth gate — skip explicitly
    // when the wizard variant doesn't offer it.
    test.skip(
      !(await draftButton.isVisible().catch(() => false)),
      'Save-as-draft not present in this wizard variant'
    );

    // If draft button exists, test the functionality
    const titleInput = page.getByLabel(/title/i);
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Incomplete job - draft test');
    }

    await draftButton.click();
    await waitForNetworkIdle(page);

    // Verify draft was saved
    const savedIndicator = page.getByText(/draft.*saved|saved as draft/i);
    await expect(savedIndicator).toBeVisible({ timeout: 10000 });
  });

  test('homeowner can view their posted jobs', async ({ page }) => {
    // Navigate to jobs list - session is already authenticated via storageState
    await page.goto('/jobs', { waitUntil: 'networkidle' });

    // Should not be redirected to login since we're authenticated
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    // The jobs page must render a concrete state — a jobs heading or an explicit
    // empty/CTA state — not merely "body has some text" (true on /login too).
    const hasHeading = await page
      .getByRole('heading', { name: /your jobs|my jobs|jobs/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no.*job|no.*result|create.*job|post.*job/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasHeading || hasEmptyState).toBeTruthy();
  });

  test('multi-step job creation flow works correctly', async ({ page }) => {
    expect(await openJobWizard(page)).toBeTruthy();

    const testJob = createTestJob();

    // Step 1 -> 2: Details. completeDetailsStep asserts Next becomes enabled,
    // so a validation regression reports the missing field rather than a 60s
    // click timeout on a permanently disabled button.
    await completeDetailsStep(page, {
      title: testJob.title,
      description: testJob.description,
      category: testJob.category,
    });
    await expect(page.locator('[data-testid="step-2-photos"]')).toBeVisible();

    // Step 2 -> 3: Photos. At least one photo is mandatory (2026-05-22).
    await completePhotosStep(page);
    await expect(page.locator('[data-testid="step-3-timeline"]')).toBeVisible();

    // Step 3 -> 4: Timeline (urgency). Budget collection was removed.
    await completeTimelineStep(page, 'medium');

    await submitJobWizard(page);

    const hasMessage = await page
      .getByText(/success|created/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMessage || !page.url().includes('/jobs/create')).toBeTruthy();
  });
});

test.describe('Job Management', () => {
  test.beforeEach(async ({ page }) => {
    const authed = await establishSessionInContext(page, TEST_USERS.homeowner);
    test.skip(!authed, AUTH_UNAVAILABLE);
  });

  test('homeowner can edit their own job', async ({ page }) => {
    // Navigate to jobs list
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    // Find an "Edit" button or link
    const editButton = page
      .getByRole('link', { name: /edit/i })
      .or(page.getByRole('button', { name: /edit/i }))
      .first();
    // The e2e seed creates no jobs, so there may be nothing to edit — a data
    // gap, not a bug. When a job IS present the edit flow is asserted for real.
    test.skip(
      !(await editButton.isVisible().catch(() => false)),
      'No seeded jobs to edit'
    );

    // Test edit functionality
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Should be on edit page
    await expect(page).toHaveURL(/edit/);

    // Should see form with existing data
    const titleInput = page.getByLabel(/title/i);
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    // Verify it has a value (the existing job title)
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);
  });

  test('homeowner can delete their own job (if no bids)', async ({ page }) => {
    // Navigate to jobs list
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth\/login|\/login/);

    // Find a "Delete" button
    const deleteButton = page
      .getByRole('button', { name: /delete|remove/i })
      .first();
    // The e2e seed creates no jobs, so there may be nothing to delete.
    test.skip(
      !(await deleteButton.isVisible().catch(() => false)),
      'No seeded jobs to delete'
    );

    // Test delete functionality
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // A destructive action MUST surface a confirmation dialog — its absence is
    // a real regression, so assert it rather than skipping.
    const confirmButton = page.getByRole('button', {
      name: /confirm|yes.*delete/i,
    });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });

    await confirmButton.click();
    await waitForNetworkIdle(page);

    // Should see success message
    await expect(page.getByText(/deleted|removed/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
