import { test, expect } from './fixtures';
import { establishSessionInContext, TEST_USERS } from './helpers/auth';

test('finance, marketing and dashboard use the same contractor earnings definition', async ({
  page,
}) => {
  expect(await establishSessionInContext(page, TEST_USERS.contractor)).toBe(
    true
  );
  const summaryResponse = await page.request.get(
    '/api/contractor/finance-summary'
  );
  expect(summaryResponse.ok(), await summaryResponse.text()).toBe(true);
  const summary = await summaryResponse.json();
  const marketingResponse = await page.request.get(
    '/api/contractor/marketing-stats'
  );
  expect(marketingResponse.ok(), await marketingResponse.text()).toBe(true);
  const marketing = await marketingResponse.json();
  expect(marketing.stats.totalEarnings).toBe(summary.allTimeRevenue);
  await page.goto('/contractor/finance');
  await expect(
    page
      .locator('#main-content')
      .getByText('Lifetime net earnings', { exact: true })
  ).toBeVisible();
  // The payout-onboarding banner and Next's route announcer are valid alerts.
  await expect(
    page.getByRole('heading', { name: 'Finance could not be loaded' })
  ).toHaveCount(0);
  const earnings = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(summary.allTimeRevenue);
  await expect(
    page
      .locator('#main-content .kpi')
      .filter({ hasText: 'Lifetime net earnings' })
  ).toContainText(earnings);
  await page.goto('/contractor/dashboard-enhanced');
  await expect(
    page
      .locator('#main-content')
      .getByText('Lifetime net earnings', { exact: true })
  ).toBeVisible();
  await expect(
    page
      .locator('#main-content .kpi')
      .filter({ hasText: 'Lifetime net earnings' })
  ).toContainText(earnings);
  expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
    true
  );
  expect(
    (await page.request.get('/api/contractor/finance-summary')).status()
  ).toBe(403);
});

test('contractor can save a linked video appointment and the homeowner receives its calendar details', async ({
  page,
}, testInfo) => {
  expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
    true
  );
  const homeownerId = (
    await (await page.request.get('/api/auth/session')).json()
  ).user.id;
  expect(await establishSessionInContext(page, TEST_USERS.contractor)).toBe(
    true
  );
  const response = await page.request.get(
    '/api/contractor/my-jobs?status=active'
  );
  expect(response.ok()).toBe(true);
  const jobs = (await response.json()).jobs;
  const job = jobs.find(
    (row: { homeowner_id: string }) => row.homeowner_id === homeownerId
  );
  expect(job).toBeTruthy();
  await page.goto('/contractor/scheduling');
  await page
    .getByRole('button', { name: /New appointment/i })
    .first()
    .click();
  const modal = page.getByRole('dialog', { name: 'New Appointment' });
  await modal.getByLabel('Linked job / client (optional)').selectOption(job.id);
  const title = `Synthetic review34 ${testInfo.project.name} ${testInfo.retry}`;
  await modal.getByPlaceholder('e.g., Kitchen Consultation').fill(title);
  const date = new Date(
    Date.now() + (90 + testInfo.project.name.length + testInfo.retry) * 86400000
  )
    .toISOString()
    .slice(0, 10);
  await modal.locator('input[type=date]').fill(date);
  const hour = testInfo.project.name.includes('firefox')
    ? 11
    : testInfo.project.name.includes('webkit')
      ? 13
      : 15;
  await modal.locator('input[type=time]').nth(0).fill(`${hour}:00`);
  await modal.locator('input[type=time]').nth(1).fill(`${hour}:30`);
  await page.getByRole('button', { name: 'Video Call', exact: true }).click();
  await page
    .getByLabel('Video call link (HTTPS)')
    .fill('https://example.test/synthetic-meeting');
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/contractor/appointments') &&
      r.request().method() === 'POST'
  );
  await page
    .getByRole('button', { name: 'Create Appointment', exact: true })
    .click();
  const created = await saved;
  expect(created.status(), await created.text()).toBe(201);
  const contractorList = await page.request.get(
    `/api/contractor/appointments?startDate=${date}&endDate=${date}`
  );
  const appointment = (await contractorList.json()).appointments.find(
    (row: { title: string }) => row.title === title
  );
  expect(appointment).toMatchObject({
    type: 'remote',
    jobId: job.id,
    videoCallUrl: 'https://example.test/synthetic-meeting',
  });
  expect(await establishSessionInContext(page, TEST_USERS.homeowner)).toBe(
    true
  );
  const homeownerList = await page.request.get(
    '/api/appointments?daysAhead=365&limit=1000'
  );
  expect(homeownerList.ok(), await homeownerList.text()).toBe(true);
  expect(
    (await homeownerList.json()).appointments.some(
      (row: { id: string; videoCallUrl?: string }) =>
        row.id === appointment.id &&
        row.videoCallUrl === 'https://example.test/synthetic-meeting'
    )
  ).toBe(true);
});

test('contractor page finder includes finance and documents have an accessible search', async ({
  page,
}) => {
  expect(await establishSessionInContext(page, TEST_USERS.contractor)).toBe(
    true
  );
  await page.goto('/contractor/documents');
  await expect(
    page.getByRole('textbox', { name: 'Search documents' })
  ).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Find a page' }).click();
  const finder = page.getByRole('searchbox', {
    name: 'Search contractor pages',
  });
  await finder.fill('finance');
  await page
    .getByRole('navigation', { name: 'Matching pages' })
    .getByRole('link', { name: 'Finance', exact: true })
    .click();
  await expect(page).toHaveURL(/\/contractor\/finance$/);
});
