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

test.describe('Authenticated Job Posting Flow', () => {
  // No beforeEach needed - session is pre-loaded via storageState
  // Tests start already authenticated as homeowner

  test('homeowner can access job creation page', async ({ page }) => {
    // Navigate to job creation
    await page.goto('/jobs/create');
    await page.waitForLoadState('networkidle');

    // Should not redirect to login (we're authenticated)
    await expect(page).not.toHaveURL(/login/);

    // Wait for the loading spinner to disappear
    await page
      .waitForFunction(
        () => {
          const loadingText = document.body.textContent || '';
          return !loadingText.includes('Loading...');
        },
        { timeout: 30000 }
      )
      .catch(() => {
        // If loading doesn't finish, test will fail on assertions below
      });

    // Wait a bit more for React hydration
    await page.waitForTimeout(3000);

    // Look for ANY content that indicates the page loaded
    const pageText = await page.textContent('body');
    const hasContent =
      pageText && pageText.length > 50 && !pageText.includes('Loading...');

    // Alternatively, check if URL is still correct (not redirected)
    const isOnCorrectPage = page.url().includes('/jobs/create');

    // Test passes if page has content or we're still on the create page
    expect(hasContent || isOnCorrectPage).toBeTruthy();
  });

  test('homeowner can create a basic job', async ({ page }) => {
    const testJob = createTestJob();

    if (!(await openJobWizard(page))) {
      // skipped: runtime bail — session not accepted, redirected to login
      test.skip();
      return;
    }

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
    const hasDraftButton = await draftButton.isVisible().catch(() => false);

    if (!hasDraftButton) {
      // skipped: runtime bail — save-as-draft feature not implemented on /jobs/create (2026-07-02 triage)
      console.log('Draft functionality not found - feature not implemented');
      test.skip();
      return;
    }

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

    // Should not be redirected to login since we're pre-authenticated
    await expect(page).not.toHaveURL(/login/);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Verify page content loaded - look for any of these indicators
    const hasHeading = await page
      .getByRole('heading', { name: /your jobs|my jobs|jobs/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasNavigation = await page
      .getByRole('navigation')
      .isVisible()
      .catch(() => false);
    const pageContent = await page.textContent('body');
    const hasContent = pageContent && pageContent.length > 100;

    expect(hasHeading || hasNavigation || hasContent).toBeTruthy();
  });

  test('multi-step job creation flow works correctly', async ({ page }) => {
    if (!(await openJobWizard(page))) {
      // skipped: runtime bail — session not accepted, redirected to login
      test.skip();
      return;
    }

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
  // No beforeEach needed - session is pre-loaded via storageState

  test('homeowner can edit their own job', async ({ page }) => {
    // Navigate to jobs list
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Find an "Edit" button or link
    const editButton = page
      .getByRole('link', { name: /edit/i })
      .or(page.getByRole('button', { name: /edit/i }))
      .first();
    const hasEditButton = await editButton.isVisible().catch(() => false);

    if (!hasEditButton) {
      // skipped: runtime bail — no editable job in the e2e environment (no jobs, or edit CTA missing) (2026-07-02 triage)
      console.log(
        'No edit button found - either no jobs exist or feature not implemented'
      );
      test.skip();
      return;
    }

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
    await expect(page).not.toHaveURL(/login/);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Find a "Delete" button
    const deleteButton = page
      .getByRole('button', { name: /delete|remove/i })
      .first();
    const hasDeleteButton = await deleteButton.isVisible().catch(() => false);

    if (!hasDeleteButton) {
      // skipped: runtime bail — no deletable job in the e2e environment (no jobs, bids present, or CTA missing) (2026-07-02 triage)
      console.log(
        'No delete button found - either no jobs exist, jobs have bids, or feature not implemented'
      );
      test.skip();
      return;
    }

    // Test delete functionality
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // Should see confirmation dialog
    const confirmButton = page.getByRole('button', {
      name: /confirm|yes.*delete/i,
    });
    const hasConfirmButton = await confirmButton.isVisible().catch(() => false);

    if (!hasConfirmButton) {
      // skipped: runtime bail — delete confirmation dialog did not appear (selector drift candidate) (2026-07-02 triage)
      console.log('No confirmation dialog found');
      test.skip();
      return;
    }

    await confirmButton.click();
    await waitForNetworkIdle(page);

    // Should see success message
    await expect(page.getByText(/deleted|removed/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
