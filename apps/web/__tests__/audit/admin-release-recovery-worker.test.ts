import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  transfer: vi.fn(),
  funding: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: state.rpc },
}));
vi.mock('@/lib/services/payment/EscrowTransferService', () => ({
  createEscrowTransfer: state.transfer,
}));
vi.mock('@/lib/services/payment/EscrowFundingService', () => ({
  verifyEscrowFunding: state.funding,
}));
import { runAdminReleaseRecovery } from '@/lib/services/payment/AdminReleaseRecoveryService';

const claim = {
  id: 'operation',
  escrow_id: 'escrow',
  principal_minor: 7000,
  fee_minor: 840,
  payout_minor: 6160,
  destination: 'acct_synthetic',
  state: 'reserved',
  transfer_id: null,
  recovery_token: 'lease-token',
};
describe('admin release recovery worker through settlement helper', () => {
  beforeEach(() => {
    state.rpc.mockReset();
    state.transfer.mockReset().mockResolvedValue({ id: 'tr_synthetic' });
    state.funding.mockReset().mockResolvedValue('ch_synthetic');
  });
  function oneClaim() {
    let claimed = false;
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_admin_release_recovery') {
        if (claimed) return { data: [], error: null };
        claimed = true;
        return { data: [claim], error: null };
      }
      if (name === 'finalize_admin_escrow_release')
        return {
          data: [{ ...claim, state: 'completed', transfer_id: 'tr_synthetic' }],
          error: null,
        };
      return { data: true, error: null };
    });
  }
  it('passes frozen amounts and deadline through settlement and acknowledges the exact lease', async () => {
    oneClaim();
    expect(await runAdminReleaseRecovery()).toEqual({
      processed: 1,
      confirmed: 1,
      failed: 0,
    });
    expect(state.transfer).toHaveBeenCalledWith(
      'escrow',
      6160,
      'acct_synthetic',
      expect.any(Number)
    );
    expect(state.rpc).toHaveBeenCalledWith('finalize_admin_escrow_release', {
      p_operation_id: 'operation',
      p_transfer_id: 'tr_synthetic',
    });
    expect(state.rpc).toHaveBeenCalledWith('finish_admin_release_recovery', {
      p_operation_id: 'operation',
      p_token: 'lease-token',
      p_error: null,
    });
  });
  it('leaves an uncertain transfer for retry without finalizing', async () => {
    oneClaim();
    state.transfer.mockRejectedValue(new Error('synthetic provider timeout'));
    expect(await runAdminReleaseRecovery()).toEqual({
      processed: 1,
      confirmed: 0,
      failed: 1,
    });
    expect(
      state.rpc.mock.calls.some(
        ([name]) => name === 'finalize_admin_escrow_release'
      )
    ).toBe(false);
    expect(state.rpc).toHaveBeenCalledWith(
      'finish_admin_release_recovery',
      expect.objectContaining({ p_error: 'provider_unavailable' })
    );
  });
  it('does not report confirmation when database finalization fails after transfer success', async () => {
    state.rpc
      .mockResolvedValueOnce({ data: [claim], error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'synthetic DB failure' },
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await runAdminReleaseRecovery()).toMatchObject({
      failed: 1,
      confirmed: 0,
    });
    expect(state.transfer).toHaveBeenCalledTimes(1);
  });
  it('rejects a stale acknowledgement even after settlement', async () => {
    state.rpc
      .mockResolvedValueOnce({ data: [claim], error: null })
      .mockResolvedValueOnce({
        data: [{ ...claim, state: 'completed', transfer_id: 'tr_synthetic' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: false, error: null });
    await expect(runAdminReleaseRecovery()).rejects.toThrow(
      'acknowledgement failed'
    );
  });
  it('does not process malformed claimed economics', async () => {
    state.rpc.mockResolvedValueOnce({
      data: [{ ...claim, payout_minor: 10000 }],
      error: null,
    });
    await expect(runAdminReleaseRecovery()).rejects.toThrow(
      'could not be verified'
    );
    expect(state.transfer).not.toHaveBeenCalled();
  });
  it('caps one execution at three operations', async () => {
    state.rpc.mockImplementation(async (name: string) => ({
      data:
        name === 'claim_admin_release_recovery'
          ? [claim]
          : name === 'finalize_admin_escrow_release'
            ? [{ ...claim, state: 'completed', transfer_id: 'tr_synthetic' }]
            : true,
      error: null,
    }));
    expect(await runAdminReleaseRecovery()).toEqual({
      processed: 3,
      confirmed: 3,
      failed: 0,
    });
    expect(state.transfer).toHaveBeenCalledTimes(3);
  });
  it('recovers a fee-only release without sending a transfer', async () => {
    const feeOnly = {
      ...claim,
      principal_minor: 30,
      fee_minor: 30,
      payout_minor: 0,
    };
    state.rpc
      .mockResolvedValueOnce({ data: [feeOnly], error: null })
      .mockResolvedValueOnce({
        data: [{ ...feeOnly, state: 'completed' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect(await runAdminReleaseRecovery()).toEqual({
      processed: 1,
      confirmed: 1,
      failed: 0,
    });
    expect(state.funding).toHaveBeenCalledWith('escrow', expect.any(Number));
    expect(state.transfer).not.toHaveBeenCalled();
  });
  it('does not claim another operation after its shared budget expires', async () => {
    oneClaim();
    const start = Date.now();
    const now = vi.spyOn(Date, 'now').mockReturnValue(start);
    try {
      state.transfer.mockImplementationOnce(async () => {
        now.mockReturnValue(start + 26000);
        return { id: 'tr_synthetic' };
      });
      expect(await runAdminReleaseRecovery()).toMatchObject({ processed: 1 });
      expect(
        state.rpc.mock.calls.filter(
          ([name]) => name === 'claim_admin_release_recovery'
        )
      ).toHaveLength(1);
    } finally {
      now.mockRestore();
    }
  });
});
