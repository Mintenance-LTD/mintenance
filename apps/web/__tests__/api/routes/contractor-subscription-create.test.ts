import { NextRequest } from 'next/server';
import { beforeEach, it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({
  create: vi.fn(),
  current: vi.fn(),
  change: vi.fn(),
  from: vi.fn(),
  retrieve: vi.fn(),
  ephemeral: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/services/subscription/SubscriptionService', () => ({
  SubscriptionService: {
    getContractorSubscription: m.current,
    createStripeSubscription: m.create,
    updateSubscriptionPlan: m.change,
  },
}));
vi.mock('@/lib/services/subscription/HomeownerSubscriptionService', () => ({
  HomeownerSubscriptionService: {},
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    subscriptions: { retrieve: m.retrieve },
    ephemeralKeys: { create: m.ephemeral },
  },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_o: unknown, h: Function) => (r: Request) =>
    h(r, {
      user: {
        id: 'contractor',
        email: 'fixture@example.test',
        role: 'contractor',
      },
    }),
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async (r: Request) => ({ data: await r.json() }),
}));
import { POST } from '@/app/api/subscriptions/create/route';
beforeEach(() => {
  vi.clearAllMocks();
  m.current.mockResolvedValue(null);
  m.create.mockResolvedValue({
    subscriptionId: 'sub_new',
    clientSecret: 'fixture_secret',
  });
  m.ephemeral.mockResolvedValue({ secret: 'fixture_ephemeral' });
  m.from.mockImplementation((table: string) => {
    const q: any = {
      select: () => q,
      eq: () => q,
      single: async () => ({
        data:
          table === 'profiles'
            ? { stripe_customer_id: 'cus_owner' }
            : { id: 'reservation' },
        error: null,
      }),
    };
    return q;
  });
});
it.each(['monthly', 'yearly'])(
  'carries %s through the contractor endpoint and keeps PaymentSheet fields',
  async (billingCycle) => {
    const response = await POST(
      new NextRequest('http://localhost/api/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ planType: 'professional', billingCycle }),
      }),
      {} as never
    );
    expect(m.create).toHaveBeenCalledWith(
      'contractor',
      'professional',
      'cus_owner',
      billingCycle
    );
    expect(await response.json()).toMatchObject({
      subscriptionId: 'reservation',
      requiresPayment: true,
      paymentSheet: { customerId: 'cus_owner' },
    });
  }
);
it('allows a billing-cycle change on the same active plan', async () => {
  m.current.mockResolvedValue({
    planType: 'professional',
    id: 'row',
    stripeSubscriptionId: 'sub_existing',
  });
  m.retrieve.mockResolvedValue({
    id: 'sub_existing',
    status: 'active',
    customer: 'cus_owner',
    metadata: { contractorId: 'contractor' },
    items: { data: [{ price: { recurring: { interval: 'month' } } }] },
  });
  m.change.mockResolvedValue({
    subscriptionId: 'sub_existing',
    requiresPayment: false,
    clientSecret: null,
  });
  await POST(
    new NextRequest('http://localhost/api/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify({
        planType: 'professional',
        billingCycle: 'yearly',
      }),
    }),
    {} as never
  );
  expect(m.change).toHaveBeenCalledWith(
    'contractor',
    'professional',
    'sub_existing',
    'yearly'
  );
  expect(m.create).not.toHaveBeenCalled();
});
