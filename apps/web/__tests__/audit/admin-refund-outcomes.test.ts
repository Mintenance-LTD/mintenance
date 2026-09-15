import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  reserve: vi.fn(),
  recover: vi.fn(),
  context: vi.fn(),
  admin: vi.fn(),
  update: vi.fn(),
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
  requireAdminFromDatabase: state.admin,
}));
vi.mock('@/lib/services/payment/RefundService', () => ({
  reserveAdminRefund: state.reserve,
  recoverRefund: state.recover,
  readRefundContext: state.context,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({
          data: {
            id: 'escrow',
            payer_id: 'payer',
            status: 'held',
            amount: 100,
            jobs: { id: 'job' },
          },
          error: null,
        }),
        update: state.update,
        insert: async () => ({ error: null }),
      };
      return q;
    },
  },
}));
import { POST } from '@/app/api/admin/refunds/[id]/route';
const operation = {
  id: 'operation',
  actor_id: 'payer',
  initiated_by: 'admin',
  escrow_id: 'escrow',
  gross_minor: 7500,
  cash_minor: 7000,
  credit_minor: 500,
  provider_refund_id: 're_synthetic',
  state: 'reserved',
};
describe('Admin durable refund route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.admin.mockResolvedValue(undefined);
    state.context.mockResolvedValue({ existing: null, remainingMinor: 7500 });
    state.reserve.mockResolvedValue(operation);
  });
  const send = (key: string | null = 'stable-key', refundAmount?: number) =>
    POST(
      new NextRequest('http://localhost/api/admin/refunds/escrow', {
        method: 'POST',
        headers: key ? { 'Idempotency-Key': key } : {},
        body: JSON.stringify({
          action: 'refund',
          reason: 'Synthetic dispute resolution',
          refundAmount,
        }),
      }),
      { params: Promise.resolve({ id: 'escrow' }) }
    );
  it.each(['pending', 'requires_action', 'failed', 'canceled'])(
    'reports %s without finalizing escrow',
    async (status) => {
      state.recover.mockResolvedValue({ ...operation, state: status });
      const response = await send();
      expect(response.status).toBe(
        ['failed', 'canceled'].includes(status) ? 409 : 202
      );
      expect(await response.json()).toMatchObject({
        success: false,
        operationId: 'operation',
        status,
      });
      expect(state.update).not.toHaveBeenCalled();
    }
  );
  it('keeps the durable operation on an ambiguous provider timeout', async () => {
    state.recover.mockRejectedValue(new Error('Provider outcome unknown'));
    const response = await send();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      success: false,
      operationId: 'operation',
      status: 'processing',
    });
    expect(state.update).not.toHaveBeenCalled();
  });
  it('uses remaining principal and reports actual cash and credit after success', async () => {
    state.recover.mockResolvedValue({ ...operation, state: 'succeeded' });
    state.context
      .mockResolvedValueOnce({ existing: null, remainingMinor: 7500 })
      .mockResolvedValueOnce({ existing: operation, remainingMinor: 0 });
    const response = await send();
    expect(await response.json()).toMatchObject({
      success: true,
      amount: 75,
      cashAmount: 70,
      creditReturned: 5,
      remainingAmount: 0,
    });
    expect(state.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin',
        payerId: 'payer',
        grossMinor: 7500,
      })
    );
  });
  it('retains original amount when retrying after settlement changed the balance', async () => {
    state.context.mockResolvedValue({ existing: operation, remainingMinor: 0 });
    state.recover.mockResolvedValue({ ...operation, state: 'succeeded' });
    await send();
    expect(state.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ grossMinor: 7500 })
    );
  });
  it('rejects missing request identity before reservation', async () => {
    await expect(send(null)).rejects.toMatchObject({ statusCode: 400 });
    expect(state.reserve).not.toHaveBeenCalled();
  });
  it('does not silently clamp an excessive amount to the original escrow', async () => {
    await expect(send('key', 101)).rejects.toMatchObject({ statusCode: 400 });
    expect(state.reserve).not.toHaveBeenCalled();
  });
  it('rechecks admin authority before reading a previous operation', async () => {
    state.admin.mockRejectedValue(new Error('Admin revoked'));
    await expect(send()).rejects.toThrow('Admin revoked');
    expect(state.context).not.toHaveBeenCalled();
  });
});
