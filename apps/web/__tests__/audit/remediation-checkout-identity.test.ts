// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  create: vi.fn(),
  from: vi.fn(),
  price: vi.fn(),
  fees: vi.fn(),
  tier: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_config: unknown, fn: Function) => (req: Request) =>
    fn(req, {
      user: { id: 'payer', email: 'payer@example.invalid', role: 'homeowner' },
    }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: {
    prices: { retrieve: m.price },
    checkout: { sessions: { create: m.create } },
  },
}));
vi.mock('@/lib/env', () => ({ getAppUrl: () => 'http://localhost:3017' }));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async (r: Request) => ({ data: await r.json() }),
}));
vi.mock('@/lib/idempotency', () => ({
  getDeterministicIdempotencyKeyFromRequest: () => 'test-key',
  checkIdempotency: vi.fn().mockResolvedValue(null),
  storeIdempotencyResult: vi.fn(),
  releaseIdempotencyClaim: vi.fn(),
  releaseOnError: (_key: string, _op: string, fn: Function) => fn(),
}));
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {
    resolveContractorTier: m.tier,
    calculateFees: m.fees,
  },
}));
import { POST } from '@/app/api/payments/embedded-checkout/route';
let job: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  m.price.mockResolvedValue({ currency: 'gbp', unit_amount: 50000 });
  m.tier.mockResolvedValue('professional');
  m.fees.mockReturnValue({ platformFee: 40 });
  job = {
    id: 'job',
    homeowner_id: 'payer',
    payer_user_id: null,
    contractor_id: 'server-contractor',
  };
  m.create.mockResolvedValue({
    id: 'cs_one',
    client_secret: 'synthetic-secret',
    payment_intent: 'pi_one',
  });
  m.from.mockImplementation((table: string) => {
    const row = () =>
      table === 'jobs'
        ? job
        : table === 'contracts'
          ? { id: 'contract', status: 'accepted' }
          : table === 'bids'
            ? { id: 'bid', amount: 500, status: 'accepted' }
            : table === 'profiles'
              ? {
                  stripe_connect_account_id: 'acct_synthetic',
                  stripe_payouts_enabled: true,
                  stripe_transfers_active: true,
                }
              : null;
    const chain: any = {};
    for (const key of [
      'select',
      'eq',
      'in',
      'insert',
      'update',
      'single',
      'limit',
    ])
      chain[key] = vi.fn(() => chain);
    chain.then = (resolve: Function) =>
      resolve({
        data: table === 'escrow_transactions' ? [] : row(),
        error: null,
      });
    return chain;
  });
});
const request = (extra: object = {}) =>
  new NextRequest('http://localhost:3017/api/payments/embedded-checkout', {
    method: 'POST',
    body: JSON.stringify({
      priceId: 'price_synthetic',
      jobId: 'job',
      quantity: 1,
      ...extra,
    }),
  });
describe('embedded checkout trusted payment identity', () => {
  it('copies server-resolved parties onto the PaymentIntent even when the client omits contractorId', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(m.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent_data: {
          metadata: expect.objectContaining({
            jobId: 'job',
            contractorId: 'server-contractor',
            payerId: 'payer',
          }),
        },
      }),
      expect.anything()
    );
  });
  it('rejects the owner when a different designated payer controls funding', async () => {
    job.payer_user_id = 'designated-other';
    expect((await POST(request())).status).toBe(404);
    expect(m.create).not.toHaveBeenCalled();
  });
  it('rejects a client-supplied different contractor', async () => {
    expect((await POST(request({ contractorId: 'unrelated' }))).status).toBe(
      400
    );
    expect(m.create).not.toHaveBeenCalled();
  });
});
