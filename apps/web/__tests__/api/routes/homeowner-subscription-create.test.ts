import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  customer: vi.fn(),
  ephemeral: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/services/subscription/HomeownerSubscriptionService', () => ({
  HomeownerSubscriptionService: {
    createSubscription: mocks.create,
    getOrCreateStripeCustomer: mocks.customer,
  },
}));
vi.mock('@/lib/services/subscription/SubscriptionService', () => ({
  SubscriptionService: {},
}));
vi.mock('@/lib/services/subscription/TrialService', () => ({
  TrialService: {},
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { ephemeralKeys: { create: mocks.ephemeral } },
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async (request: Request) => ({ data: await request.json() }),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: Request) =>
      handler(request, {
        user: { id: 'owner', email: 'owner@example.test', role: 'homeowner' },
      }),
}));
import { POST } from '@/app/api/subscriptions/create/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.customer.mockResolvedValue('cus_owner');
  mocks.create.mockResolvedValue({
    dbSubscriptionId: 'row',
    stripeSubscriptionId: 'sub_one',
    clientSecret: 'synthetic',
    status: 'active',
  });
  mocks.ephemeral.mockResolvedValue({ secret: 'synthetic_ephemeral' });
});
it.each(['monthly', 'yearly'])(
  'passes %s through to the provider transition and preserves the native PaymentSheet response',
  async (billingCycle) => {
    const response = await POST(
      new NextRequest('http://localhost/api/subscriptions/create', {
        method: 'POST',
        body: JSON.stringify({ planType: 'landlord', billingCycle }),
      }),
      {} as never
    );
    expect(mocks.create).toHaveBeenCalledWith(
      'owner',
      'cus_owner',
      'landlord',
      billingCycle
    );
    expect(await response.json()).toMatchObject({
      requiresPayment: true,
      paymentSheet: {
        customerId: 'cus_owner',
        ephemeralKeySecret: 'synthetic_ephemeral',
        clientSecret: 'synthetic',
      },
    });
    expect(mocks.from).not.toHaveBeenCalled(); // Do not guess profile activation from a client secret.
  }
);
it('returns no payment requirement when the provider transition is already paid', async () => {
  mocks.create.mockResolvedValue({
    dbSubscriptionId: 'row',
    stripeSubscriptionId: 'sub_one',
    clientSecret: null,
    status: 'active',
  });
  const response = await POST(
    new NextRequest('http://localhost/api/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify({ planType: 'landlord' }),
    }),
    {} as never
  );
  expect(await response.json()).toMatchObject({
    requiresPayment: false,
    paymentSheet: null,
  });
  expect(mocks.ephemeral).not.toHaveBeenCalled();
});
