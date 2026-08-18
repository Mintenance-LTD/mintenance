// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Stale / wrong-mode Stripe customer recovery.
 *
 * After a test→live key promotion, every stored profiles.stripe_customer_id
 * created in test mode becomes unresolvable and Stripe 400s with
 * resource_missing on the `customer` param. Before this fix that dead-ended
 * three surfaces: escrow funding, the saved-cards list ("An unexpected error
 * occurred"), and Add New Card.
 *
 * These tests pin the shared detector/cleanup helper and the payment-methods
 * list recovery (the surface in the 2026-07-31 bug report).
 */

const mocks = vi.hoisted(() => ({
  profileUpdates: [] as Array<Record<string, unknown>>,
  updateError: null as unknown,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => ({
      update: (row: Record<string, unknown>) => {
        mocks.profileUpdates.push(row);
        return {
          eq: async () => ({ error: mocks.updateError }),
        };
      },
    }),
  },
}));

import {
  isMissingCustomerError,
  clearStaleStripeCustomerId,
} from '@/lib/stripe/stale-customer';

/** The exact error shape stripe-node raises for a wrong-mode customer. */
const missingCustomerError = Object.assign(
  new Error(
    "No such customer: 'cus_UgWmNXSmX2Rnj5'; a similar object exists in test mode, but a live mode key was used to make this request."
  ),
  {
    type: 'StripeInvalidRequestError',
    code: 'resource_missing',
    param: 'customer',
    statusCode: 400,
  }
);

describe('isMissingCustomerError', () => {
  it('detects the wrong-mode customer error', () => {
    expect(isMissingCustomerError(missingCustomerError)).toBe(true);
  });

  it('does NOT swallow other Stripe failures', () => {
    // A card decline must keep propagating — recovering from it would hide a
    // real payment failure from the user.
    expect(
      isMissingCustomerError(
        Object.assign(new Error('Your card was declined'), {
          type: 'StripeCardError',
          code: 'card_declined',
          statusCode: 402,
        })
      )
    ).toBe(false);

    // resource_missing on a DIFFERENT param (e.g. a deleted price) is not
    // ours to recover from.
    expect(
      isMissingCustomerError(
        Object.assign(new Error('No such price'), {
          code: 'resource_missing',
          param: 'price',
        })
      )
    ).toBe(false);

    expect(isMissingCustomerError(new Error('boom'))).toBe(false);
    expect(isMissingCustomerError(null)).toBe(false);
    expect(isMissingCustomerError(undefined)).toBe(false);
  });
});

describe('clearStaleStripeCustomerId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileUpdates.length = 0;
    mocks.updateError = null;
  });

  it('nulls the stored id so the next flow provisions a fresh customer', async () => {
    await clearStaleStripeCustomerId('user-1', 'cus_stale', {
      service: 'payments',
      operation: 'list_payment_methods',
    });

    expect(mocks.profileUpdates).toEqual([{ stripe_customer_id: null }]);
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it('never throws when the bookkeeping write fails — the caller recovery matters more', async () => {
    mocks.updateError = { message: 'db down' };

    await expect(
      clearStaleStripeCustomerId('user-1', 'cus_stale', { service: 'payments' })
    ).resolves.toBeUndefined();

    expect(mocks.logger.error).toHaveBeenCalled();
  });
});
