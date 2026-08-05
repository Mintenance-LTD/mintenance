/**
 * TASK 1 (UK market readiness) — payment-ceiling consistency.
 *
 * Regression guard for the funnel bug where a job could be POSTED and
 * CONTRACTED above the amount it could be FUNDED at (job budget cap
 * £1,000,000 vs payment cap £10,000). Every money ceiling in the payment
 * path now derives from a single constant, MAX_JOB_PAYMENT_GBP, so a job
 * can never be created at an amount it cannot be paid for.
 *
 * These tests exercise the REAL schemas (no route mocking) and assert the
 * boundary agrees across the web validation layer and the shared api-contract
 * consumed by mobile.
 */
import { describe, it, expect } from 'vitest';
import {
  MAX_JOB_PAYMENT_GBP,
  paymentIntentRequestSchema,
  processJobPaymentRequestSchema,
} from '@mintenance/api-contracts';
import { createJobSchema } from '@/lib/validation/schemas-job';
import { paymentIntentSchema } from '@/lib/validation/schemas-payment';

const JOB_ID = '550e8400-e29b-41d4-a716-446655440000';
const CONTRACTOR_ID = '660e8400-e29b-41d4-a716-446655440111';
const OVER = MAX_JOB_PAYMENT_GBP + 0.01;

describe('Payment ceiling — single source of truth', () => {
  it('pins the ceiling at £100,000', () => {
    expect(MAX_JOB_PAYMENT_GBP).toBe(100000);
  });

  it('job budget schema accepts exactly the ceiling', () => {
    const result = createJobSchema.safeParse({
      title: 'Full house rewire',
      description:
        'Complete rewire of a four-bedroom property including consumer unit, all circuits and certification.',
      category: 'electrical',
      budget: MAX_JOB_PAYMENT_GBP,
      images: ['https://example.com/before.jpg'],
    });
    expect(result.success).toBe(true);
  });

  it('job budget schema rejects one penny over the ceiling', () => {
    const result = createJobSchema.safeParse({
      title: 'Full house rewire',
      description:
        'Complete rewire of a four-bedroom property including consumer unit, all circuits and certification.',
      category: 'electrical',
      budget: OVER,
      images: ['https://example.com/before.jpg'],
    });
    expect(result.success).toBe(false);
  });

  it('web payment schema accepts exactly the ceiling and rejects over', () => {
    expect(
      paymentIntentSchema.safeParse({
        amount: MAX_JOB_PAYMENT_GBP,
        currency: 'gbp',
        jobId: JOB_ID,
        contractorId: CONTRACTOR_ID,
      }).success
    ).toBe(true);

    expect(
      paymentIntentSchema.safeParse({
        amount: OVER,
        currency: 'gbp',
        jobId: JOB_ID,
        contractorId: CONTRACTOR_ID,
      }).success
    ).toBe(false);
  });

  it('shared api-contract (mobile) payment schema agrees at the boundary', () => {
    expect(
      paymentIntentRequestSchema.safeParse({
        amount: MAX_JOB_PAYMENT_GBP,
        currency: 'gbp',
        jobId: JOB_ID,
        contractorId: CONTRACTOR_ID,
      }).success
    ).toBe(true);

    expect(
      paymentIntentRequestSchema.safeParse({
        amount: OVER,
        currency: 'gbp',
        jobId: JOB_ID,
        contractorId: CONTRACTOR_ID,
      }).success
    ).toBe(false);

    expect(
      processJobPaymentRequestSchema.safeParse({
        jobId: JOB_ID,
        amount: MAX_JOB_PAYMENT_GBP,
        paymentMethodId: 'pm_test123',
      }).success
    ).toBe(true);
  });

  it('there is NO gap: the max postable budget is exactly the max payable amount', () => {
    // The exact failure mode the task called out: a job posted at its max
    // budget must pass the payment schema at that same amount.
    const maxBudget = MAX_JOB_PAYMENT_GBP;
    const paymentAtMaxBudget = paymentIntentSchema.safeParse({
      amount: maxBudget,
      currency: 'gbp',
      jobId: JOB_ID,
      contractorId: CONTRACTOR_ID,
    });
    expect(paymentAtMaxBudget.success).toBe(true);
  });
});
