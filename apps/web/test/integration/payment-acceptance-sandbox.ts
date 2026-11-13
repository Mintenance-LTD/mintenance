import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { CUSTOMER_TERMS_VERSION } from '@mintenance/shared';
import { stripe } from '@/lib/stripe';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  createTestUser,
  createTestJob,
  createTestBid,
  type TestUser,
} from './fixtures';
import { createAnonClient } from './supabase-test-client';
import { handleAccountUpdated } from '@/lib/services/stripe-webhook/checkout-handlers';
import { waitForSandboxAccount } from './sandbox-account-readiness';

export interface SandboxJourney {
  jobId: string;
  ownerId: string;
  contractorId: string;
  accountId: string;
  owner: Pick<TestUser, 'email' | 'password'>;
  contractor: Pick<TestUser, 'email' | 'password'>;
  request: (
    url: string,
    role: 'owner' | 'contractor',
    body: unknown,
    method?: 'GET' | 'POST'
  ) => NextRequest;
}

/** Actual route-to-provider check. Never run with a hosted DB or live key. */
export async function verifySandboxAcceptance(
  continueJourney?: (journey: SandboxJourney) => Promise<void>,
  checkout?: (journey: SandboxJourney) => Promise<void>
) {
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:57321');
  assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
  const owner = await createTestUser({ role: 'homeowner' });
  const contractor = await createTestUser({ role: 'contractor' });
  if (checkout) {
    for (const user of [owner, contractor]) {
      const profile = await db
        .from('profiles')
        .update({
          verified: true,
          phone_verified: true,
          onboarding_completed: true,
          ...(user.role === 'contractor'
            ? { verification_status: 'verified', admin_verified: true }
            : {}),
        })
        .eq('id', user.id);
      assert.equal(profile.error, null);
    }
  }
  const job = await createTestJob({
    homeowner_id: owner.id,
    title: 'itest_phase6_accept_sign_pay',
  });
  const bid = await createTestBid({
    job_id: job.id,
    contractor_id: contractor.id,
    amount: 5,
  });
  const account = await stripe.accounts.create({
    type: 'custom',
    country: 'GB',
    business_type: 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      mcc: '1520',
      product_description: 'Synthetic plumbing services for readiness testing',
    },
    individual: {
      first_name: 'Jenny',
      last_name: 'Rosen',
      email: 'readiness@example.test',
      phone: '+447700900123',
      dob: { day: 1, month: 1, year: 1902 },
      address: {
        line1: 'address_full_match',
        city: 'London',
        postal_code: 'SW1A1AA',
        country: 'GB',
      },
    },
    // Stripe-documented synthetic UK bank account; never a real bank account.
    external_account: {
      object: 'bank_account',
      country: 'GB',
      currency: 'gbp',
      routing_number: '108800',
      account_number: '00012345',
    },
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '127.0.0.1' },
    metadata: { readiness: 'phase6', contractor_id: contractor.id },
  });
  const current = await waitForSandboxAccount(account.id, true);
  assert.equal(
    current.payouts_enabled,
    true,
    'Synthetic account payouts must be enabled'
  );
  assert.equal(current.capabilities?.transfers, 'active');
  await handleAccountUpdated(current, async () => {});
  const ownerAuth = createAnonClient();
  const contractorAuth = createAnonClient();
  const ownerSession = await ownerAuth.auth.signInWithPassword({
    email: owner.email,
    password: owner.password,
  });
  const contractorSession = await contractorAuth.auth.signInWithPassword({
    email: contractor.email,
    password: contractor.password,
  });
  assert.equal(ownerSession.error, null);
  assert.equal(contractorSession.error, null);
  const request = (
    url: string,
    role: 'owner' | 'contractor',
    body: unknown,
    method: 'GET' | 'POST' = 'POST'
  ) =>
    new NextRequest(`http://localhost${url}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${(role === 'owner' ? ownerSession : contractorSession).data.session!.access_token}`,
        'idempotency-key': randomUUID(),
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify(body),
    });
  try {
    const { POST: accept } =
      await import('@/app/api/jobs/[id]/bids/[bidId]/accept/route');
    const accepted = await accept(
      request(`/api/jobs/${job.id}/bids/${bid.id}/accept`, 'owner', {}),
      { params: Promise.resolve({ id: job.id, bidId: bid.id }) }
    );
    const acceptedBody = await accepted.json();
    assert.ok(
      accepted.ok,
      `Bid acceptance: ${JSON.stringify(acceptedBody.error)}`
    );
    const contract = await db
      .from('contracts')
      .select('id')
      .eq('job_id', job.id)
      .single();
    assert.equal(contract.error, null);
    const { POST: submit, GET: review } =
      await import('@/app/api/contracts/route');
    const submitted = await submit(
      request('/api/contracts', 'contractor', {
        job_id: job.id,
        amount: 5,
        title: 'Synthetic agreed plumbing work',
        description: 'Synthetic payment readiness agreement',
        contractor_company_name: 'Readiness Test Plumbing',
        contractor_license_registration: 'READINESS-TEST',
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      }),
      { params: Promise.resolve({}) }
    );
    const submittedBody = await submitted.json();
    assert.ok(
      submitted.ok,
      `Contract submission: ${JSON.stringify(submittedBody.error)}`
    );
    const { POST: sign } =
      await import('@/app/api/contracts/[id]/accept/route');
    for (const role of ['contractor', 'owner'] as const) {
      // Read the same current agreement revision shown by the application before
      // each synthetic signature. Signing changes the revision for the next party.
      const reviewed = await review(
        request(`/api/contracts?job_id=${job.id}`, role, undefined, 'GET'),
        { params: Promise.resolve({}) }
      );
      const reviewBody = await reviewed.json();
      assert.ok(
        reviewed.ok,
        `Contract review: ${JSON.stringify(reviewBody.error)}`
      );
      const revision = reviewBody.contracts.find(
        (row: { id: string }) => row.id === contract.data!.id
      );
      assert.ok(
        revision?.review_token,
        'Current agreement review token required'
      );
      const signed = await sign(
        request(`/api/contracts/${contract.data!.id}/accept`, role, {
          legalConsent: {
            termsVersion: CUSTOMER_TERMS_VERSION,
            termsAccepted: true,
            expectedUpdatedAt: revision.updated_at,
            expectedReviewToken: revision.review_token,
            earlyStartRequested: role === 'owner',
            fullPerformanceAcknowledged: false,
          },
        }),
        { params: Promise.resolve({ id: contract.data!.id }) }
      );
      const body = await signed.json();
      assert.ok(signed.ok, `${role} signature: ${JSON.stringify(body.error)}`);
    }
    const journey: SandboxJourney = {
      jobId: job.id,
      ownerId: owner.id,
      contractorId: contractor.id,
      accountId: account.id,
      owner: { email: owner.email, password: owner.password },
      contractor: { email: contractor.email, password: contractor.password },
      request,
    };
    if (checkout) {
      await checkout(journey);
    } else {
      const { POST: pay } =
        await import('@/app/api/payments/process-job-payment/route');
      const card = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_bypassPendingInternational' },
      });
      const paid = await pay(
        request('/api/payments/process-job-payment', 'owner', {
          jobId: job.id,
          amount: 5,
          paymentMethodId: card.id,
        }),
        { params: Promise.resolve({}) }
      );
      const payment = await paid.json();
      assert.ok(
        paid.ok && payment.success,
        `Payment: ${JSON.stringify(payment.error)}`
      );
    }
    assert.equal(
      (await db.from('jobs').select('payment_status').eq('id', job.id).single())
        .data?.payment_status,
      'paid'
    );
    assert.equal(
      (
        await db
          .from('escrow_transactions')
          .select('status')
          .eq('job_id', job.id)
          .single()
      ).data?.status,
      'held'
    );
    await continueJourney?.(journey);
  } finally {
    await ownerAuth.auth.signOut();
    await contractorAuth.auth.signOut();
  }
}
