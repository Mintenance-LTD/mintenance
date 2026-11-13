import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  chromium,
  type BrowserContext,
  type Page,
  type Response,
} from 'playwright';
import { stripe } from '@/lib/stripe';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  verifySandboxAcceptance,
  type SandboxJourney,
} from './payment-acceptance-sandbox';
import { syntheticWorkPhoto } from './synthetic-work-photo';

const origin = 'http://127.0.0.1:3000';

async function successful(response: Response, label: string) {
  assert.ok(response.ok(), `${label}: HTTP ${response.status()}`);
  const body = await response.json();
  assert.notEqual(body.success, false, `${label} was rejected`);
  return body;
}

async function signIn(
  context: BrowserContext,
  credentials: SandboxJourney['owner']
) {
  const response = await context.request.post(`${origin}/api/test-auth/login`, {
    headers: { 'x-e2e-auth-secret': process.env.E2E_AUTH_SECRET! },
    data: credentials,
    timeout: 120000,
  });
  assert.equal(
    response.status(),
    200,
    'Synthetic user must receive real application/Auth cookies'
  );
}

async function dismissTour(page: Page, firstVisit = false) {
  if (firstVisit) {
    const consent = page.getByRole('dialog', {
      name: 'Cookie consent',
      exact: true,
    });
    await consent.waitFor({ state: 'visible' });
    await consent
      .getByRole('button', { name: 'Reject Non-Essential', exact: true })
      .click();
    await consent.waitFor({ state: 'hidden' });
  }
  const skip = page.getByRole('button', { name: 'Skip tour', exact: true });
  try {
    await skip.waitFor({ state: 'visible', timeout: 7000 });
  } catch {
    return;
  }
  await skip.click();
  await skip.waitFor({ state: 'hidden' });
}

/** Chromium -> real HTTP app -> local Auth/Storage/DB -> Stripe TEST API.
 * Contracts are accepted through authenticated handlers before browser checkout.
 * Localhost cannot receive public Stripe deliveries: replay a signed event using
 * the actual provider-confirmed PaymentIntent, through the real webhook endpoint.
 */
export async function verifySandboxBrowserJourney() {
  assert.equal(process.env.PAYMENT_BROWSER_TESTS, '1');
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:57321');
  assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
  assert.ok(process.env.E2E_AUTH_SECRET);
  const browser = await chromium.launch();
  const owner = await browser.newContext({ baseURL: origin });
  const contractor = await browser.newContext({
    baseURL: origin,
    permissions: ['geolocation'],
    geolocation: { latitude: 51.501, longitude: -0.141 },
  });
  const ownerPage = await owner.newPage();
  const workPage = await contractor.newPage();
  for (const page of [ownerPage, workPage]) {
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(120000);
  }
  let transferId: string | undefined;
  try {
    await verifySandboxAcceptance(
      async (journey) => {
        await signIn(contractor, journey.contractor);
        await workPage.goto(`/contractor/jobs/${journey.jobId}`);
        await dismissTour(workPage, true);
        const photo = await syntheticWorkPhoto();
        const file = (name: string) => ({
          name,
          mimeType: 'image/png',
          buffer: photo,
        });
        await workPage
          .locator('#photo-upload-input')
          .setInputFiles(file('synthetic-before.png'));
        let response = workPage.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/jobs/${journey.jobId}/photos/before`) &&
            r.request().method() === 'POST'
        );
        await workPage
          .getByRole('button', { name: 'Upload 1 Photo', exact: true })
          .click();
        await successful(await response, 'Before evidence');
        // Regression: persisted evidence must enable Start Job after a new visit.
        await workPage.reload();
        response = workPage.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/jobs/${journey.jobId}/start`) &&
            r.request().method() === 'POST'
        );
        await workPage
          .getByRole('button', { name: 'Start Job', exact: true })
          .click();
        await successful(await response, 'Start job after reload');
        await workPage.reload();
        await workPage
          .locator('#photo-upload-input')
          .setInputFiles([
            file('synthetic-after-wide.png'),
            file('synthetic-after-detail.png'),
            file('synthetic-after-overview.png'),
          ]);
        await workPage
          .getByLabel('Photo 2 angle', { exact: true })
          .selectOption('close-up');
        response = workPage.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/jobs/${journey.jobId}/photos/after`) &&
            r.request().method() === 'POST'
        );
        await workPage
          .getByRole('button', { name: 'Upload 3 Photos', exact: true })
          .click();
        assert.equal(
          (await successful(await response, 'After evidence')).jobCompleted,
          true
        );
        const completed = await db
          .from('jobs')
          .select('status')
          .eq('id', journey.jobId)
          .single();
        assert.equal(completed.error, null);
        assert.equal(completed.data?.status, 'completed');
        await ownerPage.goto('/payments');
        await dismissTour(ownerPage);
        await ownerPage
          .getByRole('button', { name: 'Approve & Release', exact: true })
          .click();
        response = ownerPage.waitForResponse(
          (r) =>
            r.url().endsWith('/api/payments/release-escrow') &&
            r.request().method() === 'POST'
        );
        await ownerPage
          .getByRole('button', { name: 'Approve & release', exact: true })
          .click();
        transferId = (
          await successful(await response, 'Owner release confirmation')
        ).transferId;
        assert.ok(transferId);
        const stored = await db
          .from('escrow_transactions')
          .select('status,transfer_id,homeowner_approval,contractor_payout')
          .eq('job_id', journey.jobId)
          .single();
        assert.equal(stored.error, null);
        assert.equal(stored.data?.status, 'completed');
        assert.equal(stored.data?.transfer_id, transferId);
        assert.equal(stored.data?.homeowner_approval, true);
        const transfer = await stripe.transfers.retrieve(transferId);
        assert.equal(transfer.livemode, false);
        assert.equal(transfer.destination, journey.accountId);
        assert.equal(
          transfer.amount,
          Math.round(Number(stored.data?.contractor_payout) * 100)
        );
        assert.equal(
          (await stripe.transfers.list({ destination: journey.accountId })).data
            .length,
          1
        );
      },
      async (journey) => {
        await signIn(owner, journey.owner);
        const setup = ownerPage.waitForResponse(
          (r) =>
            r.url().endsWith('/api/payments/create-intent') &&
            r.request().method() === 'POST'
        );
        await ownerPage.goto(`/jobs/${journey.jobId}/payment`);
        await dismissTour(ownerPage, true);
        const intentId = (await successful(await setup, 'Checkout setup'))
          .paymentIntentId;
        assert.ok(typeof intentId === 'string' && intentId.startsWith('pi_'));
        const payment = ownerPage.frameLocator(
          'iframe[title="Secure payment input frame"]'
        );
        await payment.getByLabel(/^Card number/).fill('4000003720000278');
        await payment.getByLabel(/^Expiration/).fill('1234');
        await payment.getByLabel(/^Security code/).fill('123');
        const country = payment.getByLabel('Country', { exact: true });
        if (await country.count()) await country.selectOption('GB');
        const postal = payment.getByLabel(/Postal code|ZIP code/);
        if (await postal.count()) await postal.fill('SW1A 1AA');
        await ownerPage
          .getByRole('button', { name: 'Pay £5.00 securely', exact: true })
          .click();
        await ownerPage.waitForURL(`${origin}/payments`, { timeout: 90000 });
        const intent = await stripe.paymentIntents.retrieve(intentId);
        assert.equal(intent.livemode, false);
        assert.equal(intent.status, 'succeeded');
        assert.equal(intent.amount_received, 500);
        const payload = JSON.stringify({
          id: `evt_browser_${randomUUID()}`,
          object: 'event',
          type: 'payment_intent.succeeded',
          data: { object: intent },
          created: Math.floor(Date.now() / 1000),
          livemode: false,
        });
        const signature = stripe.webhooks.generateTestHeaderString({
          payload,
          secret: process.env.STRIPE_WEBHOOK_SECRET!,
        });
        const delivered = await owner.request.post(
          `${origin}/api/webhooks/stripe`,
          {
            data: payload,
            headers: {
              'content-type': 'application/json',
              'stripe-signature': signature,
            },
            timeout: 120000,
          }
        );
        assert.equal(
          delivered.status(),
          200,
          'Signed provider event must update the real payment ledger'
        );
      }
    );
  } finally {
    await browser.close();
    if (transferId) await stripe.transfers.createReversal(transferId, {});
  }
}
