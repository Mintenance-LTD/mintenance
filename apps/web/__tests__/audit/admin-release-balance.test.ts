import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  transfer: vi.fn(),
  rpc: vi.fn(),
  funding: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, { user: { id: 'admin' }, params: { id: 'escrow' } }),
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: vi.fn(),
}));
vi.mock('@/lib/services/payment/FeeCalculationService', () => ({
  FeeCalculationService: {
    resolveContractorTier: async () => 'basic',
    calculateFees: () => ({ platformFeeRate: 0.12 }),
  },
}));
vi.mock('@/lib/services/payment/EscrowTransferService', () => ({
  createEscrowTransfer: state.transfer,
}));
vi.mock('@/lib/services/payment/EscrowFundingService', () => ({
  verifyEscrowFunding: state.funding,
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { transfers: { create: state.transfer } },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: state.rpc,
    from: (table: string) => {
      const data =
        table === 'profiles'
          ? {
              stripe_connect_account_id: 'acct_synthetic',
              stripe_payouts_enabled: true,
              stripe_transfers_active: true,
            }
          : table === 'escrow_refund_balances'
            ? { remaining_minor: 7000, needs_review: false }
            : {
                id: 'escrow',
                status: 'held',
                amount: 100,
                payer_id: 'payer',
                payee_id: 'contractor',
                payment_intent_id: 'pi_synthetic',
                jobs: {
                  id: 'job',
                  title: 'Synthetic repair',
                  homeowner_id: 'payer',
                  contractor_id: 'contractor',
                  status: 'completed',
                },
              };
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        single: async () => ({ data, error: null }),
        maybeSingle: async () => ({ data, error: null }),
        update: (values: Record<string, unknown>) => {
          state.updates.push(values);
          return q;
        },
        insert: async () => ({ error: null }),
      };
      return q;
    },
  },
}));
import { POST } from '@/app/api/admin/refunds/[id]/route';

function releaseRequest() {
  return POST(
    new NextRequest('http://localhost/api/admin/refunds/escrow', {
      method: 'POST',
      body: JSON.stringify({
        action: 'release',
        reason: 'Work reviewed and approved',
      }),
    }),
    { params: Promise.resolve({ id: 'escrow' }) }
  );
}

const operation = {
  id: 'release',
  escrow_id: 'escrow',
  principal_minor: 7000,
  fee_minor: 840,
  payout_minor: 6160,
  destination: 'acct_synthetic',
  state: 'reserved',
  transfer_id: null as string | null,
};
describe('admin release remaining principal', () => {
  beforeEach(() => {
    state.updates = [];
    state.transfer.mockReset().mockResolvedValue({ id: 'tr_synthetic' });
    state.funding.mockReset().mockResolvedValue(undefined);
    state.rpc.mockReset().mockImplementation(async (name: string) => ({
      data: [
        {
          id: 'release',
          escrow_id: 'escrow',
          principal_minor: 7000,
          fee_minor: 840,
          payout_minor: 6160,
          destination: 'acct_synthetic',
          state:
            name === 'reserve_admin_escrow_release' ? 'reserved' : 'completed',
          transfer_id:
            name === 'reserve_admin_escrow_release' ? null : 'tr_synthetic',
        },
      ],
      error: null,
    }));
  });
  it('never transfers more than the GBP 70 remaining after a GBP 30 partial refund', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/admin/refunds/escrow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'release',
          reason: 'Work reviewed and approved',
        }),
      }),
      { params: Promise.resolve({ id: 'escrow' }) }
    );
    expect(response.status).toBe(200);
    expect(state.transfer).toHaveBeenCalledTimes(1);
    expect(state.transfer).toHaveBeenCalledWith(
      'escrow',
      6160,
      'acct_synthetic'
    );
    expect(state.transfer.mock.calls[0][1]).toBeLessThanOrEqual(7000);
  });

  it('keeps provider success pending when database finalization fails', async () => {
    state.rpc
      .mockResolvedValueOnce({ data: [operation], error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'synthetic database failure' },
      });
    const response = await releaseRequest();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      success: false,
      status: 'processing',
      operationId: 'release',
    });
    expect(state.transfer).toHaveBeenCalledTimes(1);
    expect(state.updates).toEqual([]);
  });

  it('does not finalize an uncertain provider transfer or restore the escrow to held', async () => {
    state.transfer.mockRejectedValueOnce(new Error('synthetic timeout'));
    const response = await releaseRequest();
    expect(response.status).toBe(202);
    expect(state.rpc).toHaveBeenCalledTimes(1);
    expect(state.updates).toEqual([]);
  });

  it('returns an already completed reservation without another transfer', async () => {
    state.rpc.mockResolvedValueOnce({
      data: [{ ...operation, state: 'completed', transfer_id: 'tr_synthetic' }],
      error: null,
    });
    const response = await releaseRequest();
    expect(response.status).toBe(200);
    expect(state.transfer).not.toHaveBeenCalled();
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });

  it('verifies funding but sends no transfer for a fee-only balance', async () => {
    state.rpc.mockImplementation(async (name: string) => ({
      data: [
        {
          ...operation,
          principal_minor: 30,
          fee_minor: 30,
          payout_minor: 0,
          state:
            name === 'reserve_admin_escrow_release' ? 'reserved' : 'completed',
        },
      ],
      error: null,
    }));
    const response = await releaseRequest();
    expect(response.status).toBe(200);
    expect(state.funding).toHaveBeenCalledWith('escrow');
    expect(state.transfer).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({
      amount: 0.3,
      contractorPayout: 0,
      platformFee: 0.3,
    });
  });

  it('rejects a completed reservation without transfer evidence', async () => {
    state.rpc.mockResolvedValueOnce({
      data: [{ ...operation, state: 'completed' }],
      error: null,
    });
    await expect(releaseRequest()).rejects.toThrow(
      'Release operation could not be verified'
    );
    expect(state.transfer).not.toHaveBeenCalled();
  });

  it('does not report success for finalization belonging to another escrow', async () => {
    state.rpc
      .mockResolvedValueOnce({ data: [operation], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            ...operation,
            escrow_id: 'unrelated',
            state: 'completed',
            transfer_id: 'tr_synthetic',
          },
        ],
        error: null,
      });
    const response = await releaseRequest();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ success: false });
  });
});
