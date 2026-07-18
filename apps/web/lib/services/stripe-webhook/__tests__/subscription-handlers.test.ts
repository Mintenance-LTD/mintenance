// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type Stripe from 'stripe';

const { mockFrom, mockLoggerInfo, mockLoggerWarn, mockLoggerError } =
  vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarn: vi.fn(),
    mockLoggerError: vi.fn(),
  }));

function buildChain(overrides?: {
  singleData?: unknown;
  singleError?: unknown;
}) {
  const chain: Record<string, any> = {};
  for (const m of [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'or',
    'in',
    'order',
    'limit',
    'range',
    'contains',
  ]) {
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
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

import {
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '../subscription-handlers';

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function makeSub(
  overrides?: Partial<Stripe.Subscription>
): Stripe.Subscription {
  return {
    id: 'sub_test_123',
    customer: 'cus_test_123',
    status: 'active',
    items: {
      data: [{ price: { id: 'price_test', metadata: { tier: 'pro' } } }],
    },
    metadata: {},
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe('handleSubscriptionUpdated', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
  });

  it('updates profile subscription_status to active', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(makeSub({ status: 'active' }), mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'active' })
    );
  });

  it('maps Stripe past_due to past_due', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({ status: 'past_due' }),
      mockNotify
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'past_due' })
    );
  });

  it('maps Stripe canceled to cancelled (British spelling)', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({ status: 'canceled' }),
      mockNotify
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'cancelled' })
    );
  });

  it('syncs contractor_subscriptions (tier source of truth) when user is contractor', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(makeSub({ status: 'active' }), mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('contractor_subscriptions');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
    expect(chain.eq).toHaveBeenCalledWith(
      'stripe_subscription_id',
      'sub_test_123'
    );
  });

  // The webhook endpoint's dashboard-pinned api_version decides which
  // shape arrives: subscription.current_period_* at the top level
  // (pre-2025-03-31.basil) or per-item periods on subscription.items
  // (basil and later). Both must produce renewal dates — a null here
  // wipes the stored billing period.
  const PERIOD_START = 1750000000;
  const PERIOD_END = 1752592000;

  it('writes period dates from legacy top-level current_period_* (pre-basil payloads)', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({
        current_period_start: PERIOD_START,
        current_period_end: PERIOD_END,
      } as unknown as Partial<Stripe.Subscription>),
      mockNotify
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_start: new Date(PERIOD_START * 1000).toISOString(),
        current_period_end: new Date(PERIOD_END * 1000).toISOString(),
      })
    );
  });

  it('derives period dates from subscription items (basil+ payloads)', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({
        items: {
          data: [
            {
              price: { id: 'price_test', metadata: {} },
              current_period_start: PERIOD_START,
              current_period_end: PERIOD_END,
            },
          ],
        },
      } as unknown as Partial<Stripe.Subscription>),
      mockNotify
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_start: new Date(PERIOD_START * 1000).toISOString(),
        current_period_end: new Date(PERIOD_END * 1000).toISOString(),
      })
    );
  });

  it('spans the widest period across multiple subscription items (basil+ payloads)', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({
        items: {
          data: [
            {
              price: { id: 'price_a', metadata: {} },
              current_period_start: PERIOD_START + 1000,
              current_period_end: PERIOD_END - 1000,
            },
            {
              price: { id: 'price_b', metadata: {} },
              current_period_start: PERIOD_START,
              current_period_end: PERIOD_END,
            },
          ],
        },
      } as unknown as Partial<Stripe.Subscription>),
      mockNotify
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_start: new Date(PERIOD_START * 1000).toISOString(),
        current_period_end: new Date(PERIOD_END * 1000).toISOString(),
      })
    );
  });

  it('writes null period dates when neither payload shape carries them', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(makeSub(), mockNotify);

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_start: null,
        current_period_end: null,
      })
    );
  });

  it('maps trialing to trial and does not write an unknown plan_type from metadata', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    // makeSub carries price metadata tier 'pro' — not a legal plan_type,
    // so it must be dropped rather than violate the CHECK constraint.
    await handleSubscriptionUpdated(
      makeSub({ status: 'trialing' }),
      mockNotify
    );

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'trial' })
    );
    expect(chain.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ plan_type: expect.anything() })
    );
  });

  it('sends notification for past_due status', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({ status: 'past_due' }),
      mockNotify
    );

    expect(mockNotify).toHaveBeenCalledWith(
      USER_ID,
      'Subscription Payment Issue',
      expect.stringContaining('update your payment method'),
      'subscription_payment_issue'
    );
  });

  it('sends notification for canceled status', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(
      makeSub({ status: 'canceled' }),
      mockNotify
    );

    expect(mockNotify).toHaveBeenCalledWith(
      USER_ID,
      'Subscription Cancelled',
      expect.stringContaining('resubscribe'),
      'subscription_cancelled'
    );
  });

  it('does not send notification for active status', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(makeSub({ status: 'active' }), mockNotify);

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('returns early when customer ID is missing', async () => {
    await handleSubscriptionUpdated(
      makeSub({ customer: undefined as unknown as string }),
      mockNotify
    );

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Subscription missing customer ID',
      expect.any(Object)
    );
    // Should not query profiles
    expect(mockFrom).not.toHaveBeenCalledWith('profiles');
  });

  it('returns early when user not found', async () => {
    const chain = buildChain({
      singleData: null,
      singleError: { message: 'not found' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionUpdated(makeSub(), mockNotify);

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'User not found for subscription customer',
      expect.objectContaining({ customerId: 'cus_test_123' })
    );
  });
});

describe('handleSubscriptionDeleted', () => {
  let mockNotify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNotify = vi.fn().mockResolvedValue(undefined);
  });

  it('downgrades profile to none and notifies user', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'homeowner' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionDeleted(makeSub(), mockNotify);

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'none' })
    );
    expect(mockNotify).toHaveBeenCalledWith(
      USER_ID,
      'Subscription Ended',
      expect.stringContaining('free plan'),
      'subscription_ended'
    );
  });

  it('cancels the contractor_subscriptions row so tier resolution demotes', async () => {
    const chain = buildChain({
      singleData: { id: USER_ID, role: 'contractor' },
    });
    mockFrom.mockReturnValue(chain);

    await handleSubscriptionDeleted(makeSub(), mockNotify);

    expect(mockFrom).toHaveBeenCalledWith('contractor_subscriptions');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
    expect(chain.eq).toHaveBeenCalledWith(
      'stripe_subscription_id',
      'sub_test_123'
    );
  });

  it('returns early when customer ID is missing', async () => {
    await handleSubscriptionDeleted(
      makeSub({ customer: undefined as unknown as string }),
      mockNotify
    );

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Subscription missing customer ID',
      expect.any(Object)
    );
  });
});
