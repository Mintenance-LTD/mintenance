// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

const { mockFrom, mockLoggerWarn } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

function buildChain(result?: { data?: unknown; error?: unknown }) {
  const resolved = {
    data: result?.data ?? null,
    error: result?.error ?? null,
  };
  const chain: Record<string, any> = {};
  for (const m of ['select', 'in', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (
    onFulfilled?: (v: typeof resolved) => unknown,
    onRejected?: (e: unknown) => unknown
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  return chain;
}

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mockFrom },
}));

vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() },
}));

import { EngagementStatsService } from '../EngagementStatsService';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function iso(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString();
}

describe('EngagementStatsService.fetchStats', () => {
  it('returns an empty map without querying for an empty id list', async () => {
    const stats = await EngagementStatsService.fetchStats([]);
    expect(stats.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('aggregates recent wins, idle days, and mean bid-response hours', async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          // accepted 5 days ago; bid placed 2h after the job posted
          {
            contractor_id: 'c-1',
            status: 'accepted',
            created_at: iso(5 * DAY + 2 * HOUR),
            updated_at: iso(5 * DAY),
            job: { created_at: iso(5 * DAY + 4 * HOUR) },
          },
          // pending bid placed 6h after posting
          {
            contractor_id: 'c-1',
            status: 'pending',
            created_at: iso(1 * DAY),
            updated_at: iso(1 * DAY),
            job: { created_at: iso(1 * DAY + 6 * HOUR) },
          },
          // accepted 60 days ago — outside the 30-day wins window
          {
            contractor_id: 'c-2',
            status: 'accepted',
            created_at: iso(60 * DAY),
            updated_at: iso(60 * DAY),
            job: { created_at: iso(60 * DAY + HOUR) },
          },
        ],
        error: null,
      })
    );

    const stats = await EngagementStatsService.fetchStats(['c-1', 'c-2']);

    const c1 = stats.get('c-1')!;
    expect(c1.recentWins).toBe(1);
    expect(c1.daysSinceLastWin).toBe(5);
    expect(c1.avgBidResponseHours).toBeCloseTo(4, 0); // mean of 2h and 6h

    const c2 = stats.get('c-2')!;
    expect(c2.recentWins).toBe(0); // outside window
    expect(c2.daysSinceLastWin).toBe(60); // but still the last win
  });

  it('ignores negative response deltas and unparseable timestamps', async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          // bid "before" the job posted — clock skew, excluded
          {
            contractor_id: 'c-1',
            status: 'pending',
            created_at: iso(2 * DAY + HOUR),
            updated_at: null,
            job: { created_at: iso(2 * DAY) },
          },
          // no job join — excluded from responsiveness
          {
            contractor_id: 'c-1',
            status: 'pending',
            created_at: iso(DAY),
            updated_at: null,
            job: null,
          },
        ],
        error: null,
      })
    );

    const stats = await EngagementStatsService.fetchStats(['c-1']);
    expect(stats.get('c-1')!.avgBidResponseHours).toBeNull();
  });

  it('returns an empty map and warns when the query fails', async () => {
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: 'db down' } })
    );

    const stats = await EngagementStatsService.fetchStats(['c-1']);
    expect(stats.size).toBe(0);
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it('handles the array-shaped job join supabase sometimes returns', async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          {
            contractor_id: 'c-1',
            status: 'pending',
            created_at: iso(DAY),
            updated_at: null,
            job: [{ created_at: iso(DAY + 3 * HOUR) }],
          },
        ],
        error: null,
      })
    );

    const stats = await EngagementStatsService.fetchStats(['c-1']);
    expect(stats.get('c-1')!.avgBidResponseHours).toBeCloseTo(3, 0);
  });
});
