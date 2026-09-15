import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  funding: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));
vi.mock('@/lib/services/payment/EscrowFundingService', () => ({
  verifyEscrowFunding: mocks.funding,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mocks.rpc,
    from: (table: string) =>
      table === 'escrow_fee_only_settlements'
        ? { select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }
        : { update: mocks.update },
  },
}));
import {
  settleFeeOnlyEscrow,
  readFeeOnlySettlement,
  feeOnlyReleaseResponse,
} from '@/lib/services/payment/FeeOnlySettlementService';
const record = {
  id: 'settlement',
  escrow_id: 'escrow',
  principal_minor: 25,
  created_at: '2026-09-15T00:00:00Z',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.funding.mockResolvedValue('ch_verified');
  mocks.rpc.mockResolvedValue({ data: [record], error: null });
  mocks.read.mockResolvedValue({ data: record, error: null });
  mocks.eq.mockReturnValue({ eq: mocks.eq });
  mocks.update.mockReturnValue({ eq: mocks.eq });
});
describe('fee-only settlement service', () => {
  it('verifies captured funding before committing and reports no transfer', async () => {
    const order: string[] = [];
    mocks.funding.mockImplementation(async () => {
      order.push('verify');
      return 'ch_verified';
    });
    mocks.rpc.mockImplementation(async () => {
      order.push('settle');
      return { data: [record], error: null };
    });
    const settled = await settleFeeOnlyEscrow('escrow', 25, 'payer');
    expect(order).toEqual(['verify', 'settle']);
    expect(mocks.rpc).toHaveBeenCalledWith('settle_fee_only_escrow', {
      p_escrow_id: 'escrow',
      p_fee_minor: 25,
      p_actor_id: 'payer',
    });
    expect(feeOnlyReleaseResponse(settled, 500, 'contractor')).toMatchObject({
      transferId: null,
      settlementType: 'fee_only',
      contractorAmount: 0,
      platformFee: 0.25,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('does not settle unverified funding and only releases an unfinished claim', async () => {
    mocks.funding.mockRejectedValue(new Error('unfunded'));
    await expect(settleFeeOnlyEscrow('escrow', 25, null)).rejects.toThrow(
      'unfunded'
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.eq.mock.calls).toEqual([
      ['id', 'escrow'],
      ['status', 'release_pending'],
    ]);
  });
  it('keeps a lost database response unconfirmed and allows durable read recovery', async () => {
    mocks.rpc.mockRejectedValue(new Error('response lost'));
    await expect(settleFeeOnlyEscrow('escrow', 25, 'payer')).rejects.toThrow(
      'response lost'
    );
    expect(await readFeeOnlySettlement('escrow')).toEqual(record);
    expect(mocks.eq).toHaveBeenCalledWith('status', 'release_pending');
  });
  it.each([0, 51, NaN, 1.5])(
    'rejects invalid fee %s without database/provider work',
    async (fee) => {
      await expect(settleFeeOnlyEscrow('escrow', fee, null)).rejects.toThrow(
        'Invalid'
      );
      expect(mocks.funding).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    }
  );
  it.each([
    { data: null, error: { message: 'db down' } },
    { data: [], error: null },
    { data: [{ ...record, principal_minor: 26 }], error: null },
  ])('does not claim success on an invalid RPC outcome %#', async (outcome) => {
    mocks.rpc.mockResolvedValue(outcome);
    await expect(settleFeeOnlyEscrow('escrow', 25, 'payer')).rejects.toThrow();
  });
  it('returns null for a missing recovery record, and fails on a read error', async () => {
    mocks.read
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    expect(await readFeeOnlySettlement('escrow')).toBeNull();
    await expect(readFeeOnlySettlement('escrow')).rejects.toThrow(
      'could not be confirmed'
    );
  });
  it('rejects a recovery record for another escrow', async () => {
    mocks.read.mockResolvedValue({
      data: { ...record, escrow_id: 'other' },
      error: null,
    });
    await expect(readFeeOnlySettlement('escrow')).rejects.toThrow(
      'reconciliation'
    );
  });
});
