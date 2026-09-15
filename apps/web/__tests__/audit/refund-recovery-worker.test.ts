import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn(), recover: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: state.rpc },
}));
vi.mock('@/lib/services/payment/RefundService', () => ({
  operationFrom: (row: unknown) => row,
  recoverRefund: state.recover,
}));
import { runRefundRecovery } from '@/lib/services/payment/RefundRecoveryService';
import { ConflictError } from '@/lib/errors/api-error';
describe('refund recovery worker', () => {
  beforeEach(() => {
    state.rpc.mockReset();
    state.recover.mockReset();
  });
  const claim = { id: 'operation', recovery_token: 'lease-token' };
  function oneClaim() {
    state.rpc
      .mockResolvedValueOnce({ data: [claim], error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
  }
  it('recovers a claimed operation with a deadline and acknowledges the exact token', async () => {
    oneClaim();
    state.recover.mockResolvedValue({ state: 'succeeded' });
    expect(await runRefundRecovery()).toEqual({
      processed: 1,
      confirmed: 1,
      pending: 0,
      failed: 0,
    });
    expect(state.recover).toHaveBeenCalledWith(claim, expect.any(Number));
    expect(state.rpc).toHaveBeenCalledWith('finish_refund_recovery', {
      p_operation_id: 'operation',
      p_token: 'lease-token',
      p_error: null,
    });
  });
  it('records bounded reconciliation classification instead of dropping failed work', async () => {
    oneClaim();
    state.recover.mockRejectedValue(new ConflictError('Synthetic mismatch'));
    expect(await runRefundRecovery()).toMatchObject({
      failed: 1,
      confirmed: 0,
    });
    expect(state.rpc).toHaveBeenCalledWith(
      'finish_refund_recovery',
      expect.objectContaining({ p_error: 'reconciliation_required' })
    );
  });
  it('does not claim more than three operations in one run', async () => {
    state.rpc.mockImplementation(async (name: string) => ({
      data: name === 'claim_refund_recovery' ? [claim] : true,
      error: null,
    }));
    state.recover.mockResolvedValue({ state: 'pending' });
    expect(await runRefundRecovery()).toMatchObject({
      processed: 3,
      pending: 3,
    });
    expect(state.recover).toHaveBeenCalledTimes(3);
  });
  it('reports a lost acknowledgement rather than claiming completion', async () => {
    state.rpc
      .mockResolvedValueOnce({ data: [claim], error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    state.recover.mockResolvedValue({ state: 'succeeded' });
    await expect(runRefundRecovery()).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
