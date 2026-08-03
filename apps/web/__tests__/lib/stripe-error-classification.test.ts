// @vitest-environment node
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * Stripe errors must not be reported as database errors.
 *
 * 2026-08-02, from a device report: adding a card showed "Database
 * operation failed". Nothing was wrong with the database — `isDatabaseError`
 * treated ANY object with a string `code` as a Postgres error, and every
 * StripeError carries one (`resource_missing`, `card_declined`, …). The
 * payment failure was therefore answered — and logged — as a DB fault,
 * pointing debugging at the wrong subsystem for hours.
 */
const mocks = vi.hoisted(() => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));
vi.mock('@/lib/cors', () => ({ getCorsHeaders: () => ({}) }));

import { handleAPIError } from '@/lib/errors/api-error';

/** The exact shape stripe-node raises (from a production log). */
const stripeError = Object.assign(new Error("No such customer: 'cus_x'"), {
  type: 'StripeInvalidRequestError',
  rawType: 'invalid_request_error',
  code: 'resource_missing',
  param: 'customer',
  statusCode: 400,
  requestId: 'req_abc',
});

/** A genuine Postgres error, as supabase-js surfaces it. */
const pgError = {
  code: '23505',
  message: 'duplicate key value violates unique constraint',
  details: 'Key (id) already exists.',
};

describe('handleAPIError — Stripe vs database classification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does NOT report a Stripe failure as a database error', async () => {
    const res = handleAPIError(stripeError, 'req-1');
    const body = await res.json();

    expect(body.error.message).not.toMatch(/database/i);
    expect(body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    // 502: our upstream failed, the request itself was fine.
    expect(res.status).toBe(502);
    // Reassures the user about the thing they actually care about.
    expect(body.error.message).toMatch(/not charged/i);
  });

  it('logs the Stripe identifiers so the cause is findable', () => {
    handleAPIError(stripeError, 'req-1');

    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Payment provider error',
      expect.objectContaining({
        stripeCode: 'resource_missing',
        stripeType: 'StripeInvalidRequestError',
        stripeRequestId: 'req_abc',
      })
    );
  });

  it('still classifies real Postgres errors as database errors', async () => {
    // Guard against over-correcting: 23505 must keep its conflict mapping.
    const res = handleAPIError(pgError, 'req-2');
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.message).toMatch(/already exists/i);
  });

  it('maps a generic Postgres error to the database message', async () => {
    const res = handleAPIError(
      { code: '42501', message: 'permission denied for column x' },
      'req-3'
    );
    const body = await res.json();

    expect(body.error.message).toBe('Database operation failed');
    expect(res.status).toBe(500);
  });

  it('treats a Stripe card decline as a payment error, not a DB error', async () => {
    const decline = Object.assign(new Error('Your card was declined'), {
      type: 'StripeCardError',
      rawType: 'card_error',
      code: 'card_declined',
      statusCode: 402,
    });

    const res = handleAPIError(decline, 'req-4');
    const body = await res.json();

    expect(body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(body.error.message).not.toMatch(/database/i);
  });
});
