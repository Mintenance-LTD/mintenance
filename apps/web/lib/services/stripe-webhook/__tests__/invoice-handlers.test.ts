// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type Stripe from 'stripe';

const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
}));

function buildChain(overrides?: { singleData?: unknown; singleError?: unknown }) {
  const chain: Record<string, any> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'or', 'order', 'limit', 'range', 'contains']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({
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
  logger: { info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError },
}));

// Mock email service to prevent dynamic import failures
vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

import { handleInvoicePaymentSucceeded, handleInvoicePaymentFailed } from '../invoice-handlers';

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function makeInvoice(overrides?: Partial<Stripe.Invoice>): Stripe.Invoice {
  return {
    id: 'in_test_123',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    amount_paid: 2000,
    amount_due: 2000,
    currency: 'gbp',
    ...overrides,
  } as unknown as Stripe.Invoice;
}

describe('handleInvoicePaymentSucceeded', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
  });

  it('records invoice payment in invoice_payments table', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, subscription_status: 'active' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentSucceeded(makeInvoice(), mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('invoice_payments');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_id: 'in_test_123',
        user_id: USER_ID,
        status: 'paid',
        amount_paid: 2000,
      }),
      expect.objectContaining({ onConflict: 'invoice_id' }),
    );
  });

  it('reactivates past_due subscription to active', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, subscription_status: 'past_due' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentSucceeded(makeInvoice(), mockNotify);

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'active' })
    );
    expect(mockNotify).toHaveBeenCalledWith(
      USER_ID,
      'Subscription Reactivated',
      expect.stringContaining('fully active'),
      'subscription_reactivated',
    );
  });

  it('does not reactivate if subscription is already active', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, subscription_status: 'active' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentSucceeded(makeInvoice(), mockNotify);

    // update should only be called once (for the upsert chain, not for subscription reactivation)
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('returns early when customer ID is missing', async () => {
    await handleInvoicePaymentSucceeded(
      makeInvoice({ customer: undefined as unknown as string }),
      mockNotify,
    );

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Invoice missing customer ID',
      expect.any(Object),
    );
  });

  it('returns early when user not found', async () => {
    const chain = buildChain({ singleData: null, singleError: { message: 'not found' } });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentSucceeded(makeInvoice(), mockNotify);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'User not found for invoice customer',
      expect.objectContaining({ customerId: 'cus_test_123' }),
    );
  });

  it('handles customer as object with id', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, subscription_status: 'active' },
    });
    mockFrom.mockReturnValue(chain);

    const invoice = makeInvoice({
      customer: { id: 'cus_object_123' } as unknown as string,
    });
    await handleInvoicePaymentSucceeded(invoice, mockNotify);

    expect(chain.eq).toHaveBeenCalledWith('stripe_customer_id', 'cus_object_123');
  });
});

describe('handleInvoicePaymentFailed', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
  });

  it('records failed invoice payment', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, email: 'user@test.com', role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentFailed(makeInvoice({ amount_due: 3000 }), mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('invoice_payments');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_id: 'in_test_123',
        user_id: USER_ID,
        status: 'failed',
        amount_paid: 0,
        amount_due: 3000,
      }),
      expect.objectContaining({ onConflict: 'invoice_id' }),
    );
  });

  it('updates subscription to past_due when subscription exists', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, email: 'user@test.com', role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentFailed(
      makeInvoice({ subscription: 'sub_123' }),
      mockNotify,
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'past_due' })
    );
  });

  it('updates contractor_profiles when user is contractor', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, email: 'user@test.com', role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentFailed(
      makeInvoice({ subscription: 'sub_123' }),
      mockNotify,
    );

    expect(mockFrom).toHaveBeenCalledWith('contractor_profiles');
  });

  it('sends in-app notification', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, email: 'user@test.com', role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleInvoicePaymentFailed(makeInvoice(), mockNotify);

    expect(mockNotify).toHaveBeenCalledWith(
      USER_ID,
      'Payment Failed',
      expect.stringContaining('unable to process your subscription payment'),
      'invoice_payment_failed',
    );
  });

  it('returns early when customer ID is missing', async () => {
    await handleInvoicePaymentFailed(
      makeInvoice({ customer: undefined as unknown as string }),
      mockNotify,
    );

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Invoice missing customer ID',
      expect.any(Object),
    );
  });
});
