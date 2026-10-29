import type Stripe from 'stripe';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  retrieve: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
  products: vi.fn(),
  prices: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: {
      retrieve: mocks.retrieve,
      list: mocks.list,
      create: mocks.create,
      update: mocks.update,
      cancel: mocks.cancel,
    },
    products: { list: mocks.products },
    prices: { list: mocks.prices },
  },
  getInvoiceClientSecret: (invoice: {
    confirmation_secret?: { client_secret: string };
  }) => invoice?.confirmation_secret?.client_secret ?? null,
  getSubscriptionPeriodBounds: () => ({
    currentPeriodStart: null,
    currentPeriodEnd: null,
  }),
}));
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { HomeownerSubscriptionService as service } from '@/lib/services/subscription/HomeownerSubscriptionService';
import { syncHomeownerProviderState } from '@/lib/services/subscription/homeowner-provider-state';

const monthly = {
  id: 'price_month',
  currency: 'gbp',
  unit_amount: 2499,
  metadata: { tier: 'landlord' },
  recurring: { interval: 'month', interval_count: 1 },
};
const yearly = {
  ...monthly,
  id: 'price_year',
  unit_amount: 24900,
  recurring: { interval: 'year', interval_count: 1 },
};
const provider = (extra = {}) => ({
  id: 'sub_one',
  customer: 'cus_one',
  status: 'active',
  metadata: { userId: 'owner', userRole: 'homeowner', tier: 'landlord' },
  items: { data: [{ id: 'si_one', price: monthly, quantity: 1 }] },
  latest_invoice: {
    id: 'in_one',
    confirmation_secret: { client_secret: 'synthetic' },
  },
  ...extra,
});
let row: Record<string, any> | null;
let lookupError: unknown, writeError: unknown;
beforeEach(() => {
  vi.clearAllMocks();
  lookupError = null;
  writeError = null;
  row = {
    id: 'row_one',
    homeowner_id: 'owner',
    stripe_customer_id: 'cus_one',
    stripe_subscription_id: 'sub_one',
    plan_type: 'landlord',
    metadata: { billingCycle: 'monthly' },
    status: 'active',
    created_at: new Date().toISOString(),
  };
  mocks.from.mockImplementation(() => {
    let insert: Record<string, any> | undefined;
    const chain: Record<string, any> = {};
    for (const method of ['select', 'eq', 'in', 'order', 'limit'])
      chain[method] = vi.fn(() => chain);
    chain.insert = vi.fn((value) => {
      insert = value;
      return chain;
    });
    chain.update = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: row, error: lookupError }));
    chain.single = vi.fn(async () => {
      if (insert)
        row = {
          ...insert,
          id: 'reserved',
          created_at: new Date().toISOString(),
        };
      return { data: row, error: writeError };
    });
    chain.then = (resolve: (x: unknown) => unknown) =>
      Promise.resolve({ error: writeError }).then(resolve);
    return chain;
  });
  mocks.rpc.mockResolvedValue({
    data: { id: 'row_one', current: true },
    error: null,
  });
  mocks.list.mockResolvedValue({ data: [provider()], has_more: false });
  mocks.retrieve.mockResolvedValue(provider());
  mocks.products.mockResolvedValue({
    data: [{ id: 'prod', metadata: { mintenance_plan: 'homeowner_landlord' } }],
  });
  mocks.prices.mockResolvedValue({ data: [monthly, yearly] });
  mocks.update.mockResolvedValue(
    provider({ items: { data: [{ id: 'si_one', price: yearly }] } })
  );
  mocks.create.mockResolvedValue(provider({ status: 'incomplete' }));
});

it('changes monthly to yearly on the same subscription with payment-gated prorations', async () => {
  await service.createSubscription('owner', 'cus_one', 'landlord', 'yearly');
  expect(mocks.update).toHaveBeenCalledWith(
    'sub_one',
    expect.objectContaining({
      items: [{ id: 'si_one', price: 'price_year', quantity: 1 }],
      payment_behavior: 'pending_if_incomplete',
      proration_behavior: 'always_invoice',
    }),
    expect.any(Object)
  );
  expect(mocks.create).not.toHaveBeenCalled();
});
it('returns the current subscription without charging again for the same price', async () => {
  const result = await service.createSubscription(
    'owner',
    'cus_one',
    'landlord'
  );
  expect(result.clientSecret).toBeNull();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('keeps the old tier and cycle until a pending change is paid', async () => {
  mocks.update.mockResolvedValue(
    provider({
      pending_update: { subscription_items: [{ price: 'price_year' }] },
    })
  );
  const result = await service.createSubscription(
    'owner',
    'cus_one',
    'landlord',
    'yearly'
  );
  expect(result.clientSecret).toBe('synthetic');
  expect(mocks.rpc).toHaveBeenCalledWith(
    'sync_homeowner_subscription',
    expect.objectContaining({
      p_state: expect.objectContaining({
        stripe_price_id: 'price_month',
        metadata: expect.objectContaining({ billingCycle: 'monthly' }),
      }),
    })
  );
});
it('resumes a pending update without generating another invoice', async () => {
  mocks.retrieve.mockResolvedValue(
    provider({
      pending_update: { subscription_items: [{ price: 'price_year' }] },
    })
  );
  await service.createSubscription('owner', 'cus_one', 'landlord', 'yearly');
  expect(mocks.update).not.toHaveBeenCalled();
});
it('refuses a different change while payment is pending', async () => {
  mocks.retrieve.mockResolvedValue(
    provider({
      pending_update: { subscription_items: [{ price: 'price_other' }] },
    })
  );
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord', 'yearly')
  ).rejects.toThrow('pending payment');
  expect(mocks.update).not.toHaveBeenCalled();
});
it('reserves the unique current row before first purchase and uses its durable key', async () => {
  row = null;
  mocks.list.mockResolvedValue({ data: [], has_more: false });
  await service.createSubscription('owner', 'cus_one', 'landlord');
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      metadata: expect.objectContaining({ dbSubscriptionId: 'reserved' }),
    }),
    { idempotencyKey: 'homeowner_create_reserved' }
  );
});
it('does not call Stripe when a competing reservation wins', async () => {
  row = null;
  writeError = { code: '23505' };
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord')
  ).rejects.toThrow('in progress');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
});
it('recovers a provider success after a lost database save without creating another subscription', async () => {
  row!.stripe_subscription_id = null;
  mocks.list.mockResolvedValue({
    data: [
      provider({
        metadata: {
          dbSubscriptionId: 'row_one',
          userId: 'owner',
          userRole: 'homeowner',
        },
      }),
    ],
  });
  await service.createSubscription('owner', 'cus_one', 'landlord');
  expect(mocks.retrieve).toHaveBeenCalledWith('sub_one', expect.any(Object));
  expect(mocks.create).not.toHaveBeenCalled();
});
it('fails closed beyond the provider idempotency retention window', async () => {
  row!.stripe_subscription_id = null;
  row!.created_at = '2020-01-01';
  mocks.list.mockResolvedValue({ data: [] });
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord')
  ).rejects.toThrow('reconciliation');
  expect(mocks.create).not.toHaveBeenCalled();
});
it('blocks an orphaned live provider subscription even when local state is canceled', async () => {
  row = null;
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord')
  ).rejects.toThrow('existing Stripe subscription');
  expect(mocks.create).not.toHaveBeenCalled();
});
it('does not infer no subscription from a database lookup failure', async () => {
  lookupError = { message: 'offline' };
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord')
  ).rejects.toThrow('Failed to load');
  expect(mocks.list).not.toHaveBeenCalled();
});
it('rejects provider ownership mismatch', async () => {
  mocks.retrieve.mockResolvedValue(provider({ customer: 'cus_other' }));
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord')
  ).rejects.toThrow('ownership mismatch');
  expect(mocks.update).not.toHaveBeenCalled();
});
it('surfaces persistence failure instead of reporting successful activation', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'offline' } });
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord')
  ).rejects.toThrow('persist');
});
it('resumes an incomplete purchase without creating a second subscription', async () => {
  mocks.retrieve.mockResolvedValue(provider({ status: 'incomplete' }));
  expect(
    (await service.createSubscription('owner', 'cus_one', 'landlord'))
      .clientSecret
  ).toBe('synthetic');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
it('does not hide an incomplete old subscription when another cycle is requested', async () => {
  mocks.retrieve.mockResolvedValue(provider({ status: 'incomplete' }));
  await expect(
    service.createSubscription('owner', 'cus_one', 'landlord', 'yearly')
  ).rejects.toThrow('Resolve or cancel');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.cancel).not.toHaveBeenCalled();
});
it('does not report cancellation success when persistence fails', async () => {
  mocks.cancel.mockResolvedValue(provider({ status: 'canceled' }));
  mocks.rpc.mockResolvedValue({ error: { message: 'offline' } });
  await expect(service.cancelSubscription('owner', false)).rejects.toThrow(
    'persist'
  );
});
it('recovers a completed cancellation after the first database save failed', async () => {
  mocks.retrieve.mockResolvedValue(provider({ status: 'canceled' }));
  expect((await service.cancelSubscription('owner', false)).success).toBe(true);
  expect(mocks.cancel).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith(
    'sync_homeowner_subscription',
    expect.objectContaining({
      p_state: expect.objectContaining({ status: 'canceled' }),
    })
  );
});
it('does not mutate database billing status after a provider cancellation failure', async () => {
  mocks.cancel.mockRejectedValue(new Error('provider offline'));
  await expect(service.cancelSubscription('owner', false)).rejects.toThrow(
    'provider offline'
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it.each([
  ['trialing', 'trial'],
  ['paused', 'unpaid'],
  ['incomplete_expired', 'expired'],
])('maps provider %s into legal status %s', async (status, expected) => {
  await syncHomeownerProviderState(
    provider({ status }) as unknown as Stripe.Subscription,
    'owner'
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    'sync_homeowner_subscription',
    expect.objectContaining({
      p_state: expect.objectContaining({ status: expected }),
    })
  );
});
it('uses the actual item price rather than stale subscription metadata after a plan change', async () => {
  await syncHomeownerProviderState(
    provider({
      items: {
        data: [
          {
            price: {
              ...monthly,
              id: 'price_agency',
              unit_amount: 4999,
              metadata: {},
            },
          },
        ],
      },
    }) as unknown as Stripe.Subscription,
    'owner'
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    'sync_homeowner_subscription',
    expect.objectContaining({
      p_state: expect.objectContaining({ plan_type: 'agency' }),
    })
  );
});
