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
import { recordCompletionReview } from '@/lib/services/escrow/homeowner-approval/record-review';
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

it.each(['request', 'inspect', 'reject'] as const)(
  'commits %s against the client-reviewed completion version',
  async (action) => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const reviewedAt = '2026-09-14T10:00:00Z';
    if (action === 'request')
      await HomeownerApprovalService.requestHomeownerApproval(
        'escrow',
        'contractor',
        reviewedAt
      );
    else if (action === 'reject')
      await HomeownerApprovalService.rejectCompletion(
        'escrow',
        'payer',
        'Please repair the seal',
        reviewedAt
      );
    else
      await recordCompletionReview({
        escrowId: 'escrow',
        actorId: 'payer',
        action,
        completedAt: reviewedAt,
      });
    expect(mocks.rpc).toHaveBeenCalledWith(
      'record_completion_review',
      expect.objectContaining({
        p_action: action,
        p_expected_completed_at: reviewedAt,
        p_actor_id: action === 'request' ? 'contractor' : 'payer',
      })
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
  }
);
it('does not report review success when the transaction returns no decision', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  await expect(
    recordCompletionReview({
      escrowId: 'escrow',
      actorId: 'payer',
      action: 'inspect',
    })
  ).rejects.toMatchObject({ statusCode: 500 });
});
