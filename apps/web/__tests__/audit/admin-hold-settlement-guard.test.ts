const m = vi.hoisted(() => ({
  filter: vi.fn(),
  log: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        update: (value: unknown) => {
          m.update(value);
          return q;
        },
        select: () => q,
        eq: () => q,
        in: m.filter,
        single: async () => ({
          data: {
            status: 'held',
            homeowner_approval: true,
            photo_verification_status: 'verified',
          },
          error: null,
        }),
        maybeSingle: async () => ({ data: null, error: null }),
      };
      m.filter.mockImplementation(() => q);
      return q;
    },
  },
}));
vi.mock('@/lib/services/escrow/EscrowStatusService', () => ({
  EscrowStatusService: { updateStatusLog: m.log },
}));
import { AdminEscrowHoldService } from '@/lib/services/admin/AdminEscrowHoldService';
beforeEach(() => vi.clearAllMocks());
it.each([
  'holdEscrowForReview',
  'approveEscrowRelease',
  'rejectEscrowRelease',
] as const)(
  '%s rejects a lost state claim without logging success',
  async (method) => {
    await expect(
      AdminEscrowHoldService[method]('escrow', 'admin', 'Synthetic decision')
    ).rejects.toMatchObject({ statusCode: 409 });
    const allowed = m.filter.mock.calls[0][1];
    if (method === 'approveEscrowRelease')
      expect(allowed).not.toContain('disputed');
    else expect(allowed).toContain('disputed');
    const update = m.update.mock.calls[0][0];
    if (method === 'approveEscrowRelease') {
      expect(update.status).toBe('held');
      expect(update.admin_hold_status).toBe('none');
    } else {
      expect(update).not.toHaveProperty('status');
      expect(update.admin_hold_status).toBe('admin_hold');
    }
    for (const state of [
      'release_pending',
      'released',
      'completed',
      'refund_pending',
      'refunded',
    ])
      expect(allowed).not.toContain(state);
    expect(m.log).not.toHaveBeenCalled();
  }
);
