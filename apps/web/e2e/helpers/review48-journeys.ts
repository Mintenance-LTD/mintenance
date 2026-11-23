import { test, expect } from '../fixtures';
import { establishSessionInContext, TEST_USERS } from './auth';
import {
  openJobWizard,
  completeDetailsStep,
  completeTimelineStep,
  submitJobWizard,
} from './job-wizard';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';

export function registerReview48Journeys() {
  test('fresh contract requires explicit obligations and preserves them through both signatures', async ({
    page,
  }) => {
    const job = process.env.E2E_REVIEW_CONTRACT_JOB_ID;
    expect(job).toBeTruthy();
    expect(await establishSessionInContext(page, TEST_USERS.contractor)).toBe(
      true
    );
    const csrf = async () => ({
      'X-CSRF-Token': (await (await page.request.get('/api/csrf')).json())
        .token,
    });
    const details = {
      job_id: job,
      title: 'Synthetic explicit agreement',
      description: 'No work required for this isolated test.',
      amount: 2.4,
      contractor_company_name: 'Synthetic contractor',
      contractor_license_registration: 'Synthetic reference',
    };
    const missing = await page.request.post('/api/contracts', {
      headers: await csrf(),
      data: details,
    });
    expect(missing.status()).toBe(400);
    const terms = {
      materials_terms: 'No materials required.',
      warranty_terms: 'No additional contractual warranty.',
    };
    const created = await page.request.post('/api/contracts', {
      headers: await csrf(),
      data: { ...details, terms },
    });
    expect(created.status(), await created.text()).toBe(201);
    const id = (await created.json()).contract.id;
    for (const role of ['contractor', 'homeowner'] as const) {
      expect(await establishSessionInContext(page, TEST_USERS[role])).toBe(
        true
      );
      const response = await page.request.get(`/api/contracts?job_id=${job}`);
      expect(response.ok()).toBe(true);
      const contract = (await response.json()).contracts.find(
        (c: { id: string }) => c.id === id
      );
      expect(contract.terms).toMatchObject(terms);
      expect(contract.terms).not.toHaveProperty('warranty_months');
      expect(contract.terms).not.toHaveProperty('materials_included');
      const accepted = await page.request.post(`/api/contracts/${id}/accept`, {
        headers: await csrf(),
        data: {
          legalConsent: {
            termsVersion: CUSTOMER_TERMS_VERSION,
            termsAccepted: true,
            expectedUpdatedAt: contract.updated_at,
            expectedReviewToken: contract.review_token,
            earlyStartRequested: false,
            fullPerformanceAcknowledged: false,
          },
        },
      });
      expect(accepted.ok(), await accepted.text()).toBe(true);
    }
    const final = (
      await (await page.request.get(`/api/contracts?job_id=${job}`)).json()
    ).contracts.find((c: { id: string }) => c.id === id);
    expect(final.status).toBe('accepted');
    expect(final.homeowner_signed_at).toBeTruthy();
    expect(final.contractor_signed_at).toBeTruthy();
    expect(final.terms).toMatchObject(terms);
    expect(await establishSessionInContext(page, TEST_USERS.contractor)).toBe(
      true
    );
    const overwrite = await page.request.post('/api/contracts', {
      headers: await csrf(),
      data: {
        ...details,
        terms: { ...terms, warranty_terms: 'Changed terms' },
      },
    });
    expect(overwrite.status()).toBe(400);
  });

  test('property tabs remain reachable on a narrow screen and timeline loads', async ({
    page,
  }) => {
    expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
      true
    );
    await page.setViewportSize({ width: 360, height: 800 });
    const propertyPath = `/properties/${process.env.E2E_REVIEW_PROPERTY_ID}`;
    await page.goto(propertyPath);
    const tabs = page.getByRole('tablist', { name: 'Property sections' });
    await expect(tabs).toBeVisible();
    for (const name of [
      'Overview',
      'Maintenance',
      'Documents',
      'Timeline',
      'Access & contacts',
      'Assessments',
      'Manage',
    ]) {
      const tab = tabs.getByRole('tab', { name, exact: true });
      await tab.scrollIntoViewIfNeeded();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const box = await tab.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(361);
    }
    const history = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api${propertyPath}/activity` &&
        r.request().method() === 'GET'
    );
    await tabs.getByRole('tab', { name: 'Timeline', exact: true }).click();
    expect((await history).ok()).toBe(true);
    await expect(
      page.getByText('Synthetic schedule homeowner').first()
    ).toBeVisible();
  });

  test('large camera photo is resized before upload and remains attached to the created job', async ({
    page,
  }) => {
    expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
      true
    );
    await openJobWizard(page);
    await completeDetailsStep(page, {
      title: 'Synthetic large photo repair',
      description: 'Synthetic photo upload acceptance without real work.',
      category: 'plumbing',
    });
    const png = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#427d60';
        ctx.fillRect(0, 0, 64, 64);
        return canvas.toDataURL('image/png').split(',')[1];
      }),
      'base64'
    );
    await page.setInputFiles('#photo-upload', {
      name: 'camera.png',
      mimeType: 'image/png',
      buffer: Buffer.concat([png, Buffer.alloc(5_000_000)]),
    });
    await page.getByTestId('next-button').click();
    await completeTimelineStep(page);
    const uploaded = page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/jobs/upload-photos') &&
        r.request().method() === 'POST'
    );
    await submitJobWizard(page);
    const upload = await uploaded;
    expect(upload.ok(), await upload.text()).toBe(true);
    const { urls } = await upload.json();
    expect(urls).toHaveLength(1);
    const stored = await page.request.get(urls[0]);
    expect(stored.ok()).toBe(true);
    expect(stored.headers()['content-type']).toContain('image/jpeg');
    expect((await stored.body()).length).toBeLessThan(4_000_000);
    const id = new URL(page.url()).pathname.split('/')[2];
    const detail = await page.request.get(`/api/jobs/${id}`);
    expect(detail.ok()).toBe(true);
    const data = await detail.json();
    expect(JSON.stringify(data)).toContain('camera');
  });
}
