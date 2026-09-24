import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  actor: 'owner',
  job: {
    id: 'job',
    title: 'Repair',
    budget: 999,
    homeowner_id: 'owner',
    payer_user_id: 'payer',
    contractor_id: 'contractor' as string | null,
    status: 'assigned',
  },
  bid: { amount: '200.50' } as { amount: unknown } | null,
  bidError: null as unknown,
  filters: [] as unknown[][],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (
        request: NextRequest,
        context: { user: { id: string }; params: { id: string } }
      ) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, { user: { id: state.actor }, params: { id: 'job' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          state.filters.push([table, ...args]);
          return query;
        },
        single: async () => ({ data: state.job, error: null }),
        maybeSingle: async () => ({ data: state.bid, error: state.bidError }),
      };
      return query;
    },
  },
}));

import { GET } from '@/app/api/jobs/[id]/payment-details/route';
import { FeeCalculationService } from '@/lib/services/payment/FeeCalculationService';
const request = () =>
  GET(new NextRequest('http://localhost/api/jobs/job/payment-details'), {
    params: Promise.resolve({ id: 'job' }),
  });

describe('payment details accepted-bid quote', () => {
  beforeEach(() => {
    vi.spyOn(FeeCalculationService, 'resolveContractorTier').mockResolvedValue(
      'basic'
    );
    state.actor = 'owner';
    state.job.contractor_id = 'contractor';
    state.bid = { amount: '200.50' };
    state.bidError = null;
    state.filters = [];
  });
  it.each([
    ['basic', 24.06],
    ['professional', 16.04],
    ['enterprise', 10.03],
  ] as const)('quotes the resolved %s contractor fee', async (tier, fee) => {
    vi.mocked(FeeCalculationService.resolveContractorTier).mockResolvedValue(
      tier
    );
    const body = await (await request()).json();
    expect(FeeCalculationService.resolveContractorTier).toHaveBeenCalledWith(
      'contractor'
    );
    expect(body.fees.platformFee).toBe(fee);
    expect(body.fees.contractorPayout).toBe(
      Math.round((200.5 - fee) * 100) / 100
    );
    expect(body.fees.totalAmount).toBe(200.5);
  });
  it('normalizes numeric strings and binds the quote to the assigned contractor', async () => {
    const body = await (await request()).json();
    expect(body.fees.totalAmount).toBe(200.5);
    expect(state.filters).toContainEqual([
      'bids',
      'contractor_id',
      'contractor',
    ]);
  });
  it.each([
    null,
    { amount: null },
    { amount: 0 },
    { amount: -1 },
    { amount: 'invalid' },
  ])(
    'does not quote the budget when the accepted amount is unavailable: %p',
    async (bid) => {
      state.bid = bid;
      const body = await (await request()).json();
      expect(body.fees).toBeNull();
      expect(body.reason).toBe('no_payment_amount_yet');
    }
  );
  it('fails closed on a lookup error instead of quoting the budget', async () => {
    state.bidError = { code: 'XX000' };
    await expect(request()).rejects.toMatchObject({ statusCode: 503 });
  });
  it('does not query bids when no contractor is assigned', async () => {
    state.job.contractor_id = null;
    expect((await (await request()).json()).fees).toBeNull();
    expect(state.filters.some((row) => row[0] === 'bids')).toBe(false);
  });
  it('permits the designated payer but denies an unrelated actor', async () => {
    state.actor = 'payer';
    expect((await request()).status).toBe(200);
    state.actor = 'unrelated';
    await expect(request()).rejects.toMatchObject({ statusCode: 403 });
  });
});
