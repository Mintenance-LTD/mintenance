// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('@/lib/services/escrow/EscrowStatusService', () => ({
  EscrowStatusService: {},
}));
vi.mock('@/lib/services/escrow/homeowner-approval/notifications', () => ({}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn() }));
import { HomeownerApprovalService } from '@/lib/services/escrow/HomeownerApprovalService';
const completedAt = '2026-09-15T10:00:00.123456+00:00';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(() => {
    const q = {
      select: () => q,
      eq: () => q,
      single: async () => ({
        data: { jobs: [{ id: 'job', completed_at: completedAt }] },
        error: null,
      }),
    };
    return q;
  });
  mocks.rpc.mockResolvedValue({
    data: {
      applied: true,
      escrowId: 'fb160906-0000-4000-8000-000000000020',
      amount: 500,
      notificationId: null,
      coolingOffEndsAt: null,
    },
    error: null,
  });
});

it.each([
  [{}, false, false],
  [{ internal: true }, true, false],
  [{ waiveCoolingOff: true }, false, true],
])(
  'routes approval options %j through the same locked transaction',
  async (options, automatic, waive) => {
    await HomeownerApprovalService.approveCompletion(
      'escrow',
      'payer',
      'Synthetic feedback',
      options
    );
    expect(mocks.rpc).toHaveBeenCalledWith('approve_job_completion', {
      p_job_id: 'job',
      p_actor_id: 'payer',
      p_expected_completed_at: completedAt,
      p_escrow_id: 'escrow',
      p_comments: 'Synthetic feedback',
      p_automatic: automatic,
      p_waive_cooling_off: waive,
    });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  }
);
it('propagates a stale decision instead of falling back to a separate escrow write', async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { code: '23514', message: 'The job completion changed' },
  });
  await expect(
    HomeownerApprovalService.approveCompletion('escrow', 'payer')
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(mocks.from).toHaveBeenCalledTimes(1);
});
