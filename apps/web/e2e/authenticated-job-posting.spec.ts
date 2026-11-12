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

import { fixtureJob } from './helpers/bid-journey';
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
    expect(authed, AUTH_UNAVAILABLE).toBe(true);
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

  test('job wizard exposes the supported publish workflow', async ({ page }) => {
    expect(await openJobWizard(page)).toBe(true);
    await expect(page.getByRole('button', { name: /save.*draft/i })).toHaveCount(0);
    await expect(page.getByTestId('job-create-form')).toBeVisible();
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
    expect(authed, AUTH_UNAVAILABLE).toBe(true);
  });

  test('homeowner can edit their own job', async ({ page }) => {
    const id = fixtureJob('EDIT');
    await page.goto('/jobs/' + id + '/edit');
    const title = 'Synthetic edited job ' + Date.now();
    await page.getByLabel(/job title/i).fill(title);
    const saved = page.waitForResponse(r => r.url().endsWith('/api/jobs/' + id) && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    const response = await saved;
    expect(response.ok(), await response.text()).toBe(true);
    await page.goto('/jobs/' + id + '/edit');
    await expect(page.getByLabel(/job title/i)).toHaveValue(title);
  });

  test('homeowner can delete a dedicated unassigned job', async ({ page }) => {
    const id = fixtureJob('DELETE');
    await page.goto('/jobs/' + id + '/edit');
    await page.getByRole('button', { name: 'Delete Job', exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    const removed = page.waitForResponse(r => r.url().endsWith('/api/jobs/' + id) && r.request().method() === 'DELETE');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    const response = await removed;
    expect(response.ok(), await response.text()).toBe(true);
    const absent = await page.request.get('/api/jobs/' + id);
    expect(absent.status()).toBe(404);
  });
});
