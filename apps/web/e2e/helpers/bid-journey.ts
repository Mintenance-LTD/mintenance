import { expect, type Page } from '@playwright/test';

export function fixtureJob(name = 'BID'): string {
  const id = process.env[`E2E_${name}_JOB_ID`];
  expect(id, `Missing disposable ${name} job fixture`).toBeTruthy();
  return id!;
}

export async function submitAndVerifyBid(
  page: Page,
  name: string,
  jobId?: string
) {
  const id = jobId ?? fixtureJob(name);
  await page.goto(`/contractor/bid/${id}`);
  await expect(page).not.toHaveURL(/\/login/);
  await page.getByLabel(/bid amount/i).fill('180.50');
  const description =
    'Synthetic audit proposal: qualified plumber will repair the leaking tap, including replacement parts and workmanship.';
  await page.getByLabel(/proposal description/i).fill(description);
  await page.getByLabel(/estimated duration/i).fill('2');
  const start = new Date();
  start.setDate(start.getDate() + 7);
  await page
    .getByLabel(/proposed start date/i)
    .fill(start.toISOString().slice(0, 10));
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/contractor/submit-bid') &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /submit bid|update bid/i }).click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBeTruthy();
  // A fresh server read proves persistence rather than a toast or redirect.
  const saved = await page.request.get(`/api/contractor/bids?jobId=${id}`);
  expect(saved.ok()).toBeTruthy();
  const body = await saved.json();
  expect(body.bids).toHaveLength(1);
  expect(Number(body.bids[0].amount)).toBe(180.5);
  expect(body.bids[0].description).toBe(description);
  expect(body.bids[0].estimated_duration_days).toBe(2);
}
