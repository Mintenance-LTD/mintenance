import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  prices: vi.fn(),
  priceCreate: vi.fn(),
  product: vi.fn(),
  productCreate: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  link: vi.fn(),
  sync: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: m.rpc, from: m.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    prices: { list: m.prices, create: m.priceCreate },
    products: { retrieve: m.product, create: m.productCreate },
    subscriptions: { list: m.list, retrieve: m.retrieve, create: m.create },
  },
  getInvoiceClientSecret: () => 'fixture_secret',
}));
vi.mock('@/lib/services/subscription/contractor-provider-state', () => ({
  syncContractorProviderState: m.sync,
}));
import {
  contractorPrice,
  createContractorCheckout,
} from '@/lib/services/subscription/contractor-checkout';
const reservation = () => ({
  id: 'attempt_1',
  created_at: new Date().toISOString(),
  stripe_subscription_id: null,
});
const subscription = () => ({
  id: 'sub_one',
  customer: 'cus_one',
  status: 'incomplete',
  metadata: { contractorId: 'contractor', dbSubscriptionId: 'attempt_1' },
  latest_invoice: {},
});
beforeEach(() => {
  vi.resetAllMocks();
  m.rpc.mockResolvedValue({ data: reservation(), error: null });
  m.list.mockResolvedValue({ data: [], has_more: false });
  m.product.mockResolvedValue({ id: 'product' });
  m.prices.mockResolvedValue({ data: [] });
  m.priceCreate.mockResolvedValue({ id: 'price_new' });
  m.create.mockResolvedValue(subscription());
  m.retrieve.mockResolvedValue(subscription());
  const q: any = {
    update: vi.fn(() => q),
    eq: vi.fn(() => q),
    select: vi.fn(() => q),
    single: m.link,
  };
  m.from.mockReturnValue(q);
  m.link.mockResolvedValue({ data: { id: 'attempt_1' }, error: null });
  m.sync.mockResolvedValue({ id: 'attempt_1' });
});
it.each([
  ['professional', 'monthly', 2900, 'month'],
  ['professional', 'yearly', 29000, 'year'],
  ['enterprise', 'monthly', 9900, 'month'],
  ['enterprise', 'yearly', 99000, 'year'],
])('uses %s %s price', async (plan, cycle, amount, interval) => {
  await contractorPrice(plan as any, cycle as any);
  expect(m.priceCreate).toHaveBeenCalledWith(
    expect.objectContaining({ unit_amount: amount, recurring: { interval } }),
    expect.anything()
  );
});
it('reuses the existing price without creating a product', async () => {
  m.prices.mockResolvedValue({
    data: [
      {
        id: 'stable',
        currency: 'gbp',
        unit_amount: 29000,
        recurring: { interval: 'year', interval_count: 1 },
      },
    ],
  });
  expect(await contractorPrice('professional', 'yearly')).toBe('stable');
  expect(m.product).not.toHaveBeenCalled();
  expect(m.priceCreate).not.toHaveBeenCalled();
});
it('recovers a provider success after database link failure without a second subscription', async () => {
  m.link.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
  await expect(
    createContractorCheckout('contractor', 'professional', 'cus_one', 'yearly')
  ).rejects.toThrow('link');
  m.list.mockResolvedValue({ data: [subscription()], has_more: false });
  await createContractorCheckout(
    'contractor',
    'professional',
    'cus_one',
    'yearly'
  );
  expect(m.create).toHaveBeenCalledTimes(1);
  expect(m.create.mock.calls[0][1]).toEqual({
    idempotencyKey: 'contractor_checkout_attempt_1',
  });
  expect(m.sync).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'incomplete' }),
    'contractor'
  );
});
it('blocks an unresolved attempt after the provider idempotency window', async () => {
  m.rpc.mockResolvedValue({
    data: {
      ...reservation(),
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    error: null,
  });
  await expect(
    createContractorCheckout('contractor', 'professional', 'cus_one')
  ).rejects.toThrow('reconciliation');
  expect(m.create).not.toHaveBeenCalled();
});
it('does not create alongside an unlinked live subscription', async () => {
  m.list.mockResolvedValue({
    data: [{ id: 'other', status: 'active', metadata: {} }],
    has_more: false,
  });
  await expect(
    createContractorCheckout('contractor', 'professional', 'cus_one')
  ).rejects.toThrow('reconciled');
  expect(m.create).not.toHaveBeenCalled();
});
it('rejects a recovered subscription for a different customer', async () => {
  m.rpc.mockResolvedValue({
    data: { ...reservation(), stripe_subscription_id: 'sub_one' },
    error: null,
  });
  m.retrieve.mockResolvedValue({ ...subscription(), customer: 'cus_wrong' });
  await expect(
    createContractorCheckout('contractor', 'professional', 'cus_one')
  ).rejects.toThrow('ownership');
  expect(m.link).not.toHaveBeenCalled();
});
