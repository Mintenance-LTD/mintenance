/**
 * Helpers for driving the /jobs/create wizard.
 *
 * The wizard is four steps (Details / Photos / Timeline / Review) and only the
 * current step is mounted, so a test cannot fill everything up front. Each step
 * also gates its Next button on a specific set of fields — see `canProceedStep*`
 * in app/jobs/create/page.tsx.
 *
 * Specs used to fill this form with a blind `getByLabel` sweep, which failed in
 * two ways that both looked like "the Next button is disabled":
 *
 *   - The category picker is a grid of buttons under a <span> heading, not a
 *     labelled control, so `getByLabel(/category/i)` matched nothing.
 *   - ProgressBar puts aria-label="Step 1: Details" on each step wrapper, and
 *     Playwright's getByLabel reads aria-label off ANY element. So
 *     `getByLabel(/description|details/i)` matched both the textarea and the
 *     progress step, raising a strict-mode violation that the specs'
 *     `.catch(() => false)` swallowed — leaving the description empty.
 *
 * These helpers use the data-testids on the property/category/urgency buttons
 * instead, and assert the Next button is enabled before clicking so a failure
 * reports the real cause rather than a 60s click timeout.
 */

import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** 1x1 transparent PNG — the Photos step requires at least one image. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export interface JobWizardInput {
  title: string;
  /** Must be >= VALIDATION.MIN_DESCRIPTION_LENGTH (20) characters. */
  description: string;
  /** A SERVICE_CATEGORIES value, e.g. 'plumbing'. */
  category: string;
  urgency?: 'low' | 'medium' | 'high';
}

/**
 * Returns true when the wizard is actually rendered (i.e. the session was
 * accepted and we were not bounced to /login).
 */
export async function openJobWizard(page: Page): Promise<boolean> {
  await page.goto('/jobs/create');
  await page
    .waitForSelector('[data-testid="job-create-form"]', { timeout: 15000 })
    .catch(() => {});

  return !/\/(login|auth)/.test(page.url());
}

/** Fill step 1 (Details) and advance to step 2. */
export async function completeDetailsStep(
  page: Page,
  input: JobWizardInput
): Promise<void> {
  // A property must be selected; global setup seeds two for the homeowner.
  await page.locator('[data-testid="property-card"]').first().click();
  await page.locator(`[data-testid="category-${input.category}"]`).click();
  await page.locator('#job-title').fill(input.title);
  await page.locator('#job-description').fill(input.description);

  const next = page.locator('[data-testid="next-button"]');
  await expect(
    next,
    'Next stayed disabled after filling every step-1 field'
  ).toBeEnabled();
  await next.click();
}

/** Upload the required photo and advance to step 3. */
export async function completePhotosStep(page: Page): Promise<void> {
  await page.setInputFiles('#photo-upload', {
    name: 'before.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  });

  const next = page.locator('[data-testid="next-button"]');
  await expect(
    next,
    'Next stayed disabled after uploading a photo'
  ).toBeEnabled({ timeout: 15000 });
  await next.click();
}

/** Choose an urgency and advance to the Review step. */
export async function completeTimelineStep(
  page: Page,
  urgency: 'low' | 'medium' | 'high' = 'medium'
): Promise<void> {
  await page.locator(`[data-testid="urgency-${urgency}"]`).click();

  const next = page.locator('[data-testid="next-button"]');
  await expect(
    next,
    'Next stayed disabled after choosing an urgency'
  ).toBeEnabled();
  await next.click();
}

/** Drive steps 1-3, leaving the wizard on the Review step. */
export async function fillJobWizardToReview(
  page: Page,
  input: JobWizardInput
): Promise<void> {
  await completeDetailsStep(page, input);
  await completePhotosStep(page);
  await completeTimelineStep(page, input.urgency ?? 'medium');
}
