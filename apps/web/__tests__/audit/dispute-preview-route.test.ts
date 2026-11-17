// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  verify: vi.fn(),
  tier: vi.fn(),
  fees: vi.fn(),
  payment: {},
  balance: null as unknown,
  saved: null as unknown,
  error: null as unknown,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (r: NextRequest) =>
    fn(r, { user: { id: 'admin' } }),
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: m.verify,
}));
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {
    resolveContractorTier: m.tier,
    calculateFees: m.fees,
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({
          data:
            table === 'escrow_transactions'
              ? m.payment
              : table === 'escrow_refund_balances'
                ? m.balance
                : m.saved,
          error: m.error,
        }),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/admin/disputes/preview/route';
const id = '00000000-0000-4000-8000-000000000001';
const call = (decision = 'split_50_50') =>
  GET(
    new NextRequest(
      `https://example.test/api/admin/disputes/preview?escrowId=${id}&decision=${decision}`
    )
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.payment = {
    id,
    amount: 1.2,
    payer_id: 'payer',
    payee_id: 'payee',
    status: 'disputed',
  };
  m.balance = null;
  m.saved = null;
  m.error = null;
  m.verify.mockResolvedValue(undefined);
  m.tier.mockResolvedValue('basic');
  m.fees.mockReturnValue({ platformFeeRate: 0.1 });
});
it('previews exact pence, recipient IDs and minimum fee before confirmation', async () => {
  const res = await call();
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  expect(await res.json()).toMatchObject({
    escrowId: id,
    refundMinor: 60,
    releaseMinor: 60,
    feeMinor: 50,
    payoutMinor: 10,
    confirmation: {
      principalMinor: 120,
      feeRate: 0.1,
      payerId: 'payer',
      payeeId: 'payee',
    },
  });
  expect(m.verify).toHaveBeenCalledWith('admin');
});
it('uses the unrefunded balance for a new decision', async () => {
  m.balance = { gross_minor: 120, remaining_minor: 100, needs_review: false };
  expect(await (await call('refund_homeowner')).json()).toMatchObject({
    refundMinor: 100,
    feeMinor: 0,
    payoutMinor: 0,
  });
});
it('keeps a saved decision amount and fee fixed during partial settlement recovery', async () => {
  m.saved = { decision: 'split_50_50', principal_minor: 120, fee_rate: 0.05 };
  m.balance = { gross_minor: 120, remaining_minor: 60, needs_review: false };
  expect(await (await call()).json()).toMatchObject({
    confirmation: { principalMinor: 120, feeRate: 0.05 },
  });
});
it.each([
  { gross_minor: 999, remaining_minor: 100, needs_review: false },
  { gross_minor: 120, remaining_minor: 120, needs_review: true },
])('fails closed on an unreconciled balance', async (balance) => {
  m.balance = balance;
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
});
it('rejects a different saved choice', async () => {
  m.saved = {
    decision: 'refund_homeowner',
    principal_minor: 120,
    fee_rate: 0.1,
  };
  await expect(call()).rejects.toMatchObject({ statusCode: 409 });
});
it('does not expose amounts to a revoked admin', async () => {
  m.verify.mockRejectedValue(new Error('Revoked'));
  await expect(call()).rejects.toThrow('Revoked');
});
