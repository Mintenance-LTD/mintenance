// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Hoisted mocks — survive mockReset
// ---------------------------------------------------------------------------
const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Chainable Supabase mock builder
// ---------------------------------------------------------------------------
function buildChain(overrides?: { singleData?: unknown; singleError?: unknown }) {
  const chain: Record<string, any> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'or', 'order', 'limit', 'range', 'contains']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({
    data: overrides?.singleData ?? null,
    error: overrides?.singleError ?? null,
  });
  chain.maybeSingle = vi.fn().mockResolvedValue({
    data: overrides?.singleData ?? null,
    error: overrides?.singleError ?? null,
  });
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => {
  const chain = buildChain();
  mockFrom.mockReturnValue(chain);
  return { serverSupabase: { from: mockFrom } };
});

vi.mock('@mintenance/shared', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

// Helpers need the same mock so re-mock
vi.mock('../webhook-helpers', async () => {
  const actual = await vi.importActual<typeof import('../webhook-helpers')>('../webhook-helpers');
  return {
    ...actual,
    // Keep isValidUUID as-is (pure function), sendNotification is passed as param anyway
  };
});

import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handlePaymentIntentCanceled,
  handleChargeRefunded,
} from '../payment-handlers';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const JOB_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
const ESCROW_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a';

function makePaymentIntent(overrides?: Partial<Stripe.PaymentIntent>): Stripe.PaymentIntent {
  return {
    id: 'pi_test_123',
    status: 'succeeded',
    amount: 5000,
    currency: 'gbp',
    metadata: {},
    ...overrides,
  } as Stripe.PaymentIntent;
}

function makeCharge(overrides?: Partial<Stripe.Charge>): Stripe.Charge {
  return {
    id: 'ch_test_123',
    payment_intent: 'pi_test_123',
    amount_refunded: 5000,
    currency: 'gbp',
    metadata: {},
    ...overrides,
  } as Stripe.Charge;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handlePaymentIntentSucceeded', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
    const chain = buildChain({
      singleData: {
        id: ESCROW_ID,
        job_id: JOB_ID,
        payer_id: VALID_UUID,
        payee_id: VALID_UUID_2,
      },
    });
    mockFrom.mockReturnValue(chain);
  });

  it('updates escrow to held and job to paid', async () => {
    const pi = makePaymentIntent();
    await handlePaymentIntentSucceeded(pi, mockNotify);

    // Should call from('escrow_transactions') first, then from('jobs')
    expect(mockFrom).toHaveBeenCalledWith('escrow_transactions');
    expect(mockFrom).toHaveBeenCalledWith('jobs');

    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'held', payment_intent_id: 'pi_test_123' })
    );
  });

  it('backfills payer/payee when missing and metadata contains valid UUIDs', async () => {
    const chain = buildChain({
      singleData: {
        id: ESCROW_ID,
        job_id: JOB_ID,
        payer_id: null,
        payee_id: null,
      },
    });
    mockFrom.mockReturnValue(chain);

    const pi = makePaymentIntent({
      metadata: { homeownerId: VALID_UUID, contractorId: VALID_UUID_2 },
    });
    await handlePaymentIntentSucceeded(pi, mockNotify);

    // Second update call should backfill payer_id and payee_id
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ payer_id: VALID_UUID, payee_id: VALID_UUID_2 })
    );
  });

  it('warns on invalid UUID in metadata', async () => {
    const chain = buildChain({
      singleData: {
        id: ESCROW_ID,
        job_id: JOB_ID,
        payer_id: null,
        payee_id: null,
      },
    });
    mockFrom.mockReturnValue(chain);

    const pi = makePaymentIntent({
      metadata: { homeownerId: 'not-a-uuid', contractorId: VALID_UUID_2 },
    });
    await handlePaymentIntentSucceeded(pi, mockNotify);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Invalid homeownerId UUID in payment metadata',
      expect.objectContaining({ homeownerId: 'not-a-uuid' }),
    );
  });

  it('returns early when escrow update errors', async () => {
    const chain = buildChain({ singleError: { message: 'not found' } });
    mockFrom.mockReturnValue(chain);

    const pi = makePaymentIntent();
    await handlePaymentIntentSucceeded(pi, mockNotify);

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to update escrow transaction',
      expect.objectContaining({ message: 'not found' }),
      expect.any(Object),
    );
  });

  it('returns early when no escrow transaction found', async () => {
    const chain = buildChain({ singleData: null });
    mockFrom.mockReturnValue(chain);

    const pi = makePaymentIntent();
    await handlePaymentIntentSucceeded(pi, mockNotify);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'No escrow transaction found for payment intent',
      expect.objectContaining({ paymentIntentId: 'pi_test_123' }),
    );
  });
});

describe('handlePaymentIntentFailed', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
    const chain = buildChain({
      singleData: {
        id: ESCROW_ID,
        job_id: JOB_ID,
        payer_id: VALID_UUID,
      },
    });
    mockFrom.mockReturnValue(chain);
  });

  it('updates escrow to failed and notifies homeowner', async () => {
    const pi = makePaymentIntent();
    await handlePaymentIntentFailed(pi, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('escrow_transactions');
    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    );

    expect(mockNotify).toHaveBeenCalledWith(
      VALID_UUID,
      'Payment Failed',
      expect.stringContaining('payment could not be processed'),
      'payment_failed',
    );
  });

  it('uses metadata jobId when escrow has no job_id', async () => {
    const chain = buildChain({ singleData: null, singleError: { message: 'err' } });
    mockFrom.mockReturnValue(chain);

    const pi = makePaymentIntent({
      metadata: { jobId: JOB_ID, homeownerId: VALID_UUID },
    });
    await handlePaymentIntentFailed(pi, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('jobs');
  });

  it('does not notify when no homeowner ID', async () => {
    const chain = buildChain({
      singleData: { id: ESCROW_ID, job_id: JOB_ID, payer_id: null },
    });
    mockFrom.mockReturnValue(chain);

    const pi = makePaymentIntent();
    await handlePaymentIntentFailed(pi, mockNotify);

    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe('handlePaymentIntentCanceled', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
    const chain = buildChain({
      singleData: { id: ESCROW_ID, job_id: JOB_ID },
    });
    mockFrom.mockReturnValue(chain);
  });

  it('updates escrow to canceled and job to cancelled', async () => {
    const pi = makePaymentIntent();
    await handlePaymentIntentCanceled(pi, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('escrow_transactions');
    expect(mockFrom).toHaveBeenCalledWith('jobs');

    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
  });
});

describe('handleChargeRefunded', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
    const chain = buildChain({
      singleData: {
        id: ESCROW_ID,
        job_id: JOB_ID,
        payer_id: VALID_UUID,
        payee_id: VALID_UUID_2,
      },
    });
    mockFrom.mockReturnValue(chain);
  });

  it('marks escrow as refunded and records refund', async () => {
    const charge = makeCharge();
    await handleChargeRefunded(charge, mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('escrow_transactions');
    expect(mockFrom).toHaveBeenCalledWith('refunds');

    const chain = mockFrom.mock.results[0].value;
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'refunded' })
    );
  });

  it('notifies both payer and payee', async () => {
    const charge = makeCharge({ amount_refunded: 10000 });
    await handleChargeRefunded(charge, mockNotify);

    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith(
      VALID_UUID,
      'Refund Processed',
      expect.stringContaining('£100.00'),
      'refund_processed',
    );
    expect(mockNotify).toHaveBeenCalledWith(
      VALID_UUID_2,
      'Payment Refunded',
      expect.stringContaining('£100.00'),
      'payment_refunded',
    );
  });

  it('returns early when charge has no payment_intent', async () => {
    const charge = makeCharge({ payment_intent: null as unknown as string });
    await handleChargeRefunded(charge, mockNotify);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Charge has no payment intent',
      expect.objectContaining({ chargeId: 'ch_test_123' }),
    );
    expect(mockFrom).not.toHaveBeenCalledWith('escrow_transactions');
  });

  it('handles refund record failure gracefully', async () => {
    // First call returns escrow, but we need upsert to throw for refunds table
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'refunds') {
        return {
          upsert: vi.fn().mockRejectedValue(new Error('Refund record failed')),
        };
      }
      const chain = buildChain({
        singleData: {
          id: ESCROW_ID,
          job_id: JOB_ID,
          payer_id: VALID_UUID,
          payee_id: VALID_UUID_2,
        },
      });
      return chain;
    });

    const charge = makeCharge();
    // Should not throw
    await expect(handleChargeRefunded(charge, mockNotify)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to record refund',
      expect.any(Error),
      expect.objectContaining({ chargeId: 'ch_test_123' }),
    );
  });
});
