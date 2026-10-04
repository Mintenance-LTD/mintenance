// Actual Stripe sandbox and local Postgres; no provider/database mocks.
// Run only through scripts/readiness/run-payment-sandbox.cjs.
import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  createTestUser,
  createTestJob,
  createTestBid,
} from '../../test/integration/fixtures';
import { createAnonClient } from '../../test/integration/supabase-test-client';
import {
  reservePaymentFunding,
  attachPaymentFunding,
} from '@/lib/services/payment/PaymentFundingService';
import { applyPaymentIntentState } from '@/lib/services/stripe-webhook/payment-state-transition';
import {
  reserveRefund,
  recoverRefund,
} from '@/lib/services/payment/RefundService';
import { createEscrowTransfer } from '@/lib/services/payment/EscrowTransferService';
import {
  compareReconciliationFunding,
  type ReconciliationSource,
} from '@/lib/services/payment/reconciliation-funding';
import { StripeWebhookService } from '@/lib/services/stripe-webhook/stripe-webhook-service';

describe.skipIf(process.env.PAYMENT_SANDBOX_TESTS !== '1')(
  'Payment sandbox readiness',
  () => {
    it('accepts a bid, signs both parties and funds escrow through authenticated handlers', async () => {
      const { verifySandboxAcceptance } =
        await import('../../test/integration/payment-acceptance-sandbox');
      await verifySandboxAcceptance();
    }, 60000);

    beforeAll(async () => {
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:57321' ||
        !process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
      )
        throw new Error('Sandbox guard failed');
      const balance = await stripe.balance.retrieve();
      const available =
        balance.available.find((row) => row.currency === 'gbp')?.amount ?? 0;
      if (available < 1000) {
        const amount = 2000 - available;
        if (amount > 100000)
          throw new Error('Sandbox balance needs manual review');
        const seed = await stripe.charges.create({
          amount,
          currency: 'gbp',
          source: 'tok_bypassPending',
          description: 'Phase 6 synthetic available-balance seed',
          metadata: { readiness: 'phase6' },
        });
        expect(seed.livemode).toBe(false);
      }
    });

    async function funded(credit = 0) {
      const owner = await createTestUser({ role: 'homeowner' });
      const contractor = await createTestUser({ role: 'contractor' });
      const job = await createTestJob({
        homeowner_id: owner.id,
        title: `itest_phase6_${randomUUID()}`,
      });
      expect(
        (
          await db
            .from('jobs')
            .update({ contractor_id: contractor.id })
            .eq('id', job.id)
        ).error
      ).toBeNull();
      const bid = await createTestBid({
        job_id: job.id,
        contractor_id: contractor.id,
        amount: 5,
        status: 'accepted',
      });
      const contractId = randomUUID();
      expect(
        (
          await db.from('contracts').insert({
            id: contractId,
            job_id: job.id,
            homeowner_id: owner.id,
            contractor_id: contractor.id,
            amount: 5,
            status: 'accepted',
          })
        ).error
      ).toBeNull();
      if (credit)
        expect(
          (
            await db
              .from('user_credits')
              .insert({ user_id: owner.id, balance_pence: credit })
          ).error
        ).toBeNull();
      const input = {
        actorId: owner.id,
        jobId: job.id,
        bidId: bid.id,
        contractId,
        requestKey: randomUUID(),
        grossMinor: 500,
      };
      const reservation = await reservePaymentFunding(input);
      expect((await reservePaymentFunding(input)).id).toBe(reservation.id);
      const intent = await stripe.paymentIntents.create(
        {
          amount: reservation.cash_minor,
          currency: 'gbp',
          payment_method: 'pm_card_bypassPendingInternational',
          payment_method_types: ['card'],
          confirm: true,
          metadata: {
            jobId: job.id,
            payerId: owner.id,
            contractorId: contractor.id,
            bidId: bid.id,
            contractId,
            fundingReservationId: reservation.id,
            creditAppliedPence: String(credit),
            readiness: 'phase6',
          },
        },
        { idempotencyKey: `readiness_${reservation.id}` }
      );
      expect(intent.livemode).toBe(false);
      expect(intent.status).toBe('succeeded');
      const escrow = await attachPaymentFunding(reservation.id, intent.id);
      const payload = JSON.stringify({
        id: `evt_readiness_${randomUUID()}`,
        type: 'payment_intent.succeeded',
        data: { object: intent },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
      });
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      });
      const webhook = await StripeWebhookService.getInstance().handleRequest(
        new NextRequest('http://localhost/api/webhooks/stripe', {
          method: 'POST',
          body: payload,
          headers: { 'stripe-signature': signature },
        })
      );
      expect(webhook.status).toBe(200);
      expect(
        (
          await applyPaymentIntentState(
            intent.id,
            'succeeded',
            intent.amount_received,
            intent.currency
          )
        )?.status
      ).toBe('held');
      expect(
        (
          await db
            .from('jobs')
            .select('payment_status')
            .eq('id', job.id)
            .single()
        ).data?.payment_status
      ).toBe('paid');
      return { owner, contractor, job, reservation, intent, escrow };
    }

    it('captures cash plus credit, refunds once after replay, and reconciles the provider ledger', async () => {
      const f = await funded(50);
      expect(f.reservation.cash_minor).toBe(450);
      const op = await reserveRefund({
        actorId: f.owner.id,
        jobId: f.job.id,
        escrowId: f.escrow.id,
        requestKey: randomUUID(),
        grossMinor: 500,
        reason: 'requested_by_customer',
      });
      const first = await recoverRefund(op);
      expect(first.state).toBe('succeeded');
      const retry = await recoverRefund(op);
      expect(retry.provider_refund_id).toBe(first.provider_refund_id);
      expect(
        (await stripe.refunds.list({ payment_intent: f.intent.id })).data
      ).toHaveLength(1);
      const balance = await db
        .from('escrow_refund_balances')
        .select('*')
        .eq('escrow_id', f.escrow.id)
        .single();
      expect(balance.error).toBeNull();
      expect(balance.data).toMatchObject({
        cash_refunded_minor: 450,
        credit_returned_minor: 50,
        remaining_minor: 0,
        needs_review: false,
      });
      const stored = await db
        .from('escrow_transactions')
        .select('*')
        .eq('id', f.escrow.id)
        .single();
      expect(stored.data?.status).toBe('refunded');
      const funding = await db
        .from('payment_funding_reservations')
        .select('*')
        .eq('id', f.reservation.id)
        .single();
      const intent = await stripe.paymentIntents.retrieve(f.intent.id, {
        expand: ['latest_charge'],
      });
      const source = {
        ...stored.data,
        funding: funding.data,
        refund: balance.data,
      } as ReconciliationSource;
      expect(compareReconciliationFunding(source, intent).matched).toBe(true);
      expect(
        await applyPaymentIntentState(
          intent.id,
          'succeeded',
          intent.amount_received,
          intent.currency
        )
      ).toBeNull();
    }, 60000);

    it('creates one connected-account transfer when a payout request is retried', async () => {
      const f = await funded();
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'GB',
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
        business_profile: {
          mcc: '1520',
          product_description:
            'Synthetic plumbing services for payment readiness testing',
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
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '127.0.0.1',
        },
        metadata: { readiness: 'phase6' },
      });
      expect(
        (
          await db
            .from('profiles')
            .update({ stripe_connect_account_id: account.id })
            .eq('id', f.contractor.id)
        ).error
      ).toBeNull();
      expect(
        (
          await db
            .from('escrow_transactions')
            .update({ status: 'release_pending' })
            .eq('id', f.escrow.id)
        ).error
      ).toBeNull();
      const transfer = await createEscrowTransfer(f.escrow.id, 400, account.id);
      expect(
        (await createEscrowTransfer(f.escrow.id, 400, account.id)).id
      ).toBe(transfer.id);
      const provider = await stripe.transfers.retrieve(transfer.id);
      expect(provider).toMatchObject({
        livemode: false,
        amount: 400,
        currency: 'gbp',
        destination: account.id,
        reversed: false,
      });
      const record = await db
        .from('escrow_transfer_attempts')
        .select('transfer_id')
        .eq('escrow_id', f.escrow.id)
        .single();
      expect(record.data?.transfer_id).toBe(transfer.id);
      // Retain the isolated synthetic ledger/provider objects as auditable evidence.
      // This checks Connect transfer, not a bank payout or the completion/photo UI.
    }, 60000);

    it('rejects bad signatures and acknowledges only durably completed webhook duplicates', async () => {
      const event = {
        id: `evt_readiness_${randomUUID()}`,
        type: 'readiness.test',
        data: { object: {} },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
      };
      const payload = JSON.stringify(event);
      const service = StripeWebhookService.getInstance();
      const send = (signature: string) =>
        service.handleRequest(
          new NextRequest('http://localhost/api/webhooks/stripe', {
            method: 'POST',
            body: payload,
            headers: { 'stripe-signature': signature },
          })
        );
      expect((await send('invalid')).status).toBe(400);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      });
      expect((await send(signature)).status).toBe(200);
      const duplicate = await send(signature);
      expect(duplicate.status).toBe(200);
      expect(await duplicate.json()).toMatchObject({ duplicate: true });
      expect(
        (
          await db
            .from('webhook_events')
            .update({ status: 'pending' })
            .eq('event_id', event.id)
        ).error
      ).toBeNull();
      expect((await send(signature)).status).toBe(500);
      expect(
        (
          await db
            .from('webhook_events')
            .update({ status: 'processed' })
            .eq('event_id', event.id)
        ).error
      ).toBeNull();
    }, 30000);

    it('processes a saved card through authenticated production route handlers and records both payment states', async () => {
      const owner = await createTestUser({ role: 'homeowner' });
      const contractor = await createTestUser({ role: 'contractor' });
      const job = await createTestJob({
        homeowner_id: owner.id,
        status: 'assigned',
        title: 'itest_phase6_saved_card',
      });
      expect(
        (
          await db
            .from('jobs')
            .update({ contractor_id: contractor.id })
            .eq('id', job.id)
        ).error
      ).toBeNull();
      await createTestBid({
        job_id: job.id,
        contractor_id: contractor.id,
        amount: 5,
        status: 'accepted',
      });
      expect(
        (
          await db.from('contracts').insert({
            job_id: job.id,
            homeowner_id: owner.id,
            contractor_id: contractor.id,
            amount: 5,
            status: 'accepted',
          })
        ).error
      ).toBeNull();
      const customer = await stripe.customers.create({
        metadata: { readiness: 'phase6', userId: owner.id },
      });
      const card = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
      });
      await stripe.paymentMethods.attach(card.id, { customer: customer.id });
      expect(
        (
          await db
            .from('profiles')
            .update({ stripe_customer_id: customer.id })
            .eq('id', owner.id)
        ).error
      ).toBeNull();
      const auth = createAnonClient();
      const session = await auth.auth.signInWithPassword({
        email: owner.email,
        password: owner.password,
      });
      expect(session.error).toBeNull();
      const { POST } =
        await import('@/app/api/payments/process-job-payment/route');
      const response = await POST(
        new NextRequest('http://localhost/api/payments/process-job-payment', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${session.data.session!.access_token}`,
            'content-type': 'application/json',
            'x-forwarded-for': '127.0.0.1',
            'idempotency-key': randomUUID(),
          },
          body: JSON.stringify({
            jobId: job.id,
            amount: 5,
            paymentMethodId: card.id,
          }),
        }),
        { params: Promise.resolve({}) }
      );
      const body = await response.json();
      expect(body.error).toBeUndefined();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      const escrow = await db
        .from('escrow_transactions')
        .select('id,status')
        .eq('job_id', job.id)
        .single();
      expect(escrow.data?.status).toBe('held');
      expect(
        (
          await db
            .from('jobs')
            .select('payment_status')
            .eq('id', job.id)
            .single()
        ).data?.payment_status
      ).toBe('paid');
      expect(
        (await stripe.paymentIntents.retrieve(body.paymentIntentId)).livemode
      ).toBe(false);
      await auth.auth.signOut();
    }, 60000);
  }
);
