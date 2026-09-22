// @vitest-environment node
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  refund: vi.fn(),
  release: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
vi.mock('@/lib/services/payment/RefundService', () => ({
  operationFrom: (x: unknown) => x,
  recoverRefund: m.refund,
}));
vi.mock('@/lib/services/payment/AdminReleaseService', () => ({
  readAdminReleaseOperation: (x: unknown) => x,
  recoverAdminRelease: m.release,
}));
import { runDisputeResolutionRecovery } from '@/lib/services/payment/DisputeResolutionRecoveryService';

const claim = {
  id: 'fc160906-0000-4000-8000-000000000040',
  escrow_id: 'fc160906-0000-4000-8000-000000000020',
  initiated_by: 'fc160906-0000-4000-8000-000000000001',
  recovery_token: 'fc160906-0000-4000-8000-000000000050',
  decision: 'split_50_50',
  reason: 'Synthetic decision',
  principal_minor: 50001,
  refund_minor: 25000,
  release_minor: 25001,
  state: 'processing',
};
let claims: unknown[];
beforeEach(() => {
  vi.clearAllMocks();
  claims = [claim];
  m.refund.mockResolvedValue({ state: 'succeeded' });
  m.release.mockResolvedValue({ state: 'completed' });
  m.rpc.mockImplementation(async (name: string) => {
    if (name === 'claim_dispute_resolution_recovery')
      return { data: claims.length ? [claims.shift()] : [], error: null };
    if (name === 'reserve_dispute_refund')
      return {
        data: { escrow_id: claim.escrow_id, gross_minor: 25000 },
        error: null,
      };
    if (name === 'reserve_dispute_release')
      return {
        data: { escrow_id: claim.escrow_id, principal_minor: 25001 },
        error: null,
      };
    if (name === 'finalize_dispute_resolution')
      return { data: [{ ...claim, state: 'completed' }], error: null };
    return { data: true, error: null };
  });
});
it('recovers the whole saved decision and acknowledges only its own lease', async () => {
  expect(await runDisputeResolutionRecovery()).toEqual({
    processed: 1,
    confirmed: 1,
    pending: 0,
    failed: 0,
  });
  expect(m.rpc).toHaveBeenCalledWith('reserve_dispute_refund', {
    p_admin_id: claim.initiated_by,
    p_resolution_id: claim.id,
  });
  expect(m.rpc).toHaveBeenCalledWith('reserve_dispute_release', {
    p_admin_id: claim.initiated_by,
    p_resolution_id: claim.id,
  });
  expect(m.refund.mock.calls[0][1]).toEqual(m.release.mock.calls[0][1]);
  expect(m.refund.mock.calls[0][1]).toEqual(expect.any(Number));
  expect(m.rpc).toHaveBeenCalledWith('finish_dispute_resolution_recovery', {
    p_resolution_id: claim.id,
    p_token: claim.recovery_token,
    p_error: null,
  });
});
it('keeps a provider-pending refund open without starting a payout', async () => {
  m.refund.mockResolvedValue({ state: 'pending' });
  expect(await runDisputeResolutionRecovery()).toMatchObject({
    confirmed: 0,
    pending: 1,
    failed: 0,
  });
  expect(m.release).not.toHaveBeenCalled();
  expect(
    m.rpc.mock.calls.some(([name]) => name === 'finalize_dispute_resolution')
  ).toBe(false);
});
it('records a terminal refund for intervention without sending the payout', async () => {
  m.refund.mockResolvedValue({ state: 'failed' });
  expect(await runDisputeResolutionRecovery()).toMatchObject({
    confirmed: 0,
    failed: 1,
  });
  expect(m.release).not.toHaveBeenCalled();
  expect(m.rpc).toHaveBeenCalledWith(
    'finish_dispute_resolution_recovery',
    expect.objectContaining({ p_error: 'reconciliation_required' })
  );
});
it('retains current-admin checks and flags revoked authority for intervention', async () => {
  const implementation = m.rpc.getMockImplementation()!;
  m.rpc.mockImplementation(async (name: string) =>
    name === 'reserve_dispute_refund'
      ? { data: null, error: { code: '42501' } }
      : implementation(name)
  );
  expect(await runDisputeResolutionRecovery()).toMatchObject({
    failed: 1,
    confirmed: 0,
  });
  expect(m.refund).not.toHaveBeenCalled();
  expect(m.release).not.toHaveBeenCalled();
  expect(m.rpc).toHaveBeenCalledWith(
    'finish_dispute_resolution_recovery',
    expect.objectContaining({ p_error: 'reconciliation_required' })
  );
});
it('continues to other queued decisions after a provider failure', async () => {
  claims = [claim, { ...claim, id: 'fc160906-0000-4000-8000-000000000041' }];
  m.refund
    .mockRejectedValueOnce(new Error('Provider unavailable'))
    .mockResolvedValueOnce({ state: 'pending' });
  expect(await runDisputeResolutionRecovery()).toEqual({
    processed: 2,
    confirmed: 0,
    pending: 1,
    failed: 1,
  });
});
it('acknowledges malformed decisions for backoff without touching money', async () => {
  claims = [{ ...claim, refund_minor: 25001, release_minor: 25000 }];
  expect(await runDisputeResolutionRecovery()).toMatchObject({ failed: 1 });
  expect(m.refund).not.toHaveBeenCalled();
  expect(m.release).not.toHaveBeenCalled();
  expect(m.rpc).toHaveBeenCalledWith(
    'finish_dispute_resolution_recovery',
    expect.objectContaining({ p_token: claim.recovery_token })
  );
});
it('rejects a lost lease acknowledgement even after settlement succeeded', async () => {
  const implementation = m.rpc.getMockImplementation()!;
  m.rpc.mockImplementation(async (name: string) =>
    name === 'finish_dispute_resolution_recovery'
      ? { data: false, error: null }
      : implementation(name)
  );
  await expect(runDisputeResolutionRecovery()).rejects.toThrow(
    'acknowledgement failed'
  );
});
it('does not reserve the payout or claim more work after the shared deadline expires', async () => {
  const start = Date.now();
  const now = vi.spyOn(Date, 'now').mockReturnValue(start);
  try {
    m.refund.mockImplementationOnce(async () => {
      now.mockReturnValue(start + 26000);
      return { state: 'succeeded' };
    });
    expect(await runDisputeResolutionRecovery()).toMatchObject({
      processed: 1,
      failed: 1,
    });
    expect(m.release).not.toHaveBeenCalled();
    expect(
      m.rpc.mock.calls.filter(
        ([name]) => name === 'claim_dispute_resolution_recovery'
      )
    ).toHaveLength(1);
    expect(
      m.rpc.mock.calls.some(([name]) => name === 'reserve_dispute_release')
    ).toBe(false);
  } finally {
    now.mockRestore();
  }
});
it('caps a run at three decisions', async () => {
  claims = [claim, claim, claim, claim];
  expect(await runDisputeResolutionRecovery()).toMatchObject({
    processed: 3,
    confirmed: 3,
  });
  expect(claims).toHaveLength(1);
});
