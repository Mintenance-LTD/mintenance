// @vitest-environment node
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  refund: vi.fn(),
  release: vi.fn(),
  events: [] as string[],
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
import {
  readDisputeResolution,
  recoverDisputeSettlement,
  type DisputeResolution,
} from '@/lib/services/payment/DisputeSettlementService';
const resolution: DisputeResolution = {
  id: 'fc160906-0000-4000-8000-000000000040',
  escrow_id: 'fc160906-0000-4000-8000-000000000020',
  decision: 'split_50_50',
  reason: 'Synthetic decision',
  principal_minor: 50001,
  refund_minor: 25000,
  release_minor: 25001,
  state: 'processing',
};
beforeEach(() => {
  vi.clearAllMocks();
  m.events.length = 0;
  m.rpc.mockImplementation(async (name: string) => {
    m.events.push(name);
    return {
      error: null,
      data:
        name === 'reserve_dispute_refund'
          ? { escrow_id: resolution.escrow_id, gross_minor: 25000 }
          : name === 'reserve_dispute_release'
            ? { escrow_id: resolution.escrow_id, principal_minor: 25001 }
            : { ...resolution, state: 'completed' },
    };
  });
  m.refund.mockImplementation(async () => {
    m.events.push('refund');
    return { state: 'succeeded' };
  });
  m.release.mockImplementation(async () => {
    m.events.push('release');
    return { state: 'completed' };
  });
});
it('reserves and confirms the refund before reserving release, then finalizes', async () => {
  expect(await recoverDisputeSettlement('admin', resolution)).toMatchObject({
    status: 'completed',
  });
  expect(m.events).toEqual([
    'reserve_dispute_refund',
    'refund',
    'reserve_dispute_release',
    'release',
    'finalize_dispute_resolution',
  ]);
});
it.each([
  'pending',
  'requires_action',
  'failed',
  'canceled',
  'reconciliation_required',
])('does not release or finalize with refund %s', async (state) => {
  m.refund.mockResolvedValue({ state });
  const result = await recoverDisputeSettlement('admin', resolution);
  expect(result.status).not.toBe('completed');
  expect(m.release).not.toHaveBeenCalled();
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
it('leaves finalization for retry if transfer recovery throws', async () => {
  m.release.mockRejectedValue(
    new Error('Database update failed after provider transfer')
  );
  await expect(recoverDisputeSettlement('admin', resolution)).rejects.toThrow();
  expect(m.events).not.toContain('finalize_dispute_resolution');
});
it('rejects a mismatched reservation before sending money', async () => {
  m.rpc.mockResolvedValue({
    data: { escrow_id: 'another-escrow', gross_minor: 25000 },
    error: null,
  });
  await expect(recoverDisputeSettlement('admin', resolution)).rejects.toThrow();
  expect(m.refund).not.toHaveBeenCalled();
});
it.each([
  { decision: 'refund_homeowner', refund_minor: 25000, release_minor: 25001 },
  { decision: 'pay_contractor', refund_minor: 25000, release_minor: 25001 },
  { decision: 'split_50_50', refund_minor: 25001, release_minor: 25000 },
  {
    decision: 'split_50_50',
    principal_minor: 1,
    refund_minor: 0,
    release_minor: 1,
  },
])(
  'rejects amounts inconsistent with the saved decision: %j',
  async (change) => {
    const invalid = { ...resolution, ...change } as DisputeResolution;
    expect(() => readDisputeResolution(invalid)).toThrow();
    await expect(recoverDisputeSettlement('admin', invalid)).rejects.toThrow();
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.refund).not.toHaveBeenCalled();
    expect(m.release).not.toHaveBeenCalled();
  }
);
it.each([{ rows: [] }, { rows: [resolution, resolution] }])(
  'rejects ambiguous or missing reservation rows',
  ({ rows }) => {
    expect(() => readDisputeResolution(rows)).toThrow();
  }
);
it.each([
  resolution,
  {
    ...resolution,
    decision: 'refund_homeowner',
    refund_minor: 50001,
    release_minor: 0,
  },
  {
    ...resolution,
    decision: 'pay_contractor',
    refund_minor: 0,
    release_minor: 50001,
  },
])('accepts correctly allocated decisions', (row) => {
  expect(readDisputeResolution([row])).toEqual(row);
});
