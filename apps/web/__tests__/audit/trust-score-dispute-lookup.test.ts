// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  result: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from },
}));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/services/reviews/contractor-rating', () => ({
  getContractorRatingStats: async () => ({ count: 0, average: 0 }),
}));
import { TrustScoreService } from '@/lib/services/contractor/TrustScoreService';
beforeEach(() => {
  vi.clearAllMocks();
  const disputes = { select: m.select, eq: m.eq, in: m.result };
  m.select.mockReturnValue(disputes);
  m.eq.mockReturnValue(disputes);
  m.from.mockImplementation((table: string) => {
    if (table === 'disputes') return disputes;
    if (table === 'jobs')
      return {
        select: () => ({
          eq: async () => ({ data: [{ id: 'job', status: 'completed' }] }),
        }),
      };
    const profile = {
      select: () => profile,
      eq: () => profile,
      single: async () => ({
        data: { id: 'contractor', created_at: new Date().toISOString() },
      }),
    };
    return profile;
  });
});
describe('contractor dispute lookup', () => {
  it('counts disputes through the assigned job instead of a nonexistent column', async () => {
    m.result.mockResolvedValue({ data: [{ id: 'dispute' }], error: null });
    const score = await TrustScoreService.calculateTrustScore('contractor');
    expect(m.select).toHaveBeenCalledWith('id, jobs!inner(contractor_id)');
    expect(m.eq).toHaveBeenCalledWith('jobs.contractor_id', 'contractor');
    expect(score).toBeLessThan(0.7);
  });
  it('uses the conservative fallback when dispute lookup fails', async () => {
    m.result.mockResolvedValue({
      data: null,
      error: { message: 'unavailable' },
    });
    expect(await TrustScoreService.calculateTrustScore('contractor')).toBe(0.5);
  });
});
