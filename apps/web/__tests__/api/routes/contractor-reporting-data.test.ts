import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { user: { id: 'contractor' } }),
}));
import { GET } from '@/app/api/contractor/reporting/route';
const builders: Record<string, any> = {};
let failedTable = '';
beforeEach(() => {
  vi.clearAllMocks();
  failedTable = '';
  mocks.from.mockImplementation((table: string) => {
    const now = new Date().toISOString();
    const data: Record<string, unknown[]> = {
      jobs: [
        {
          id: 'job',
          status: 'completed',
          created_at: '2020-01-01',
          completed_at: now,
          category: 'Garden',
        },
      ],
      bids: [{ status: 'accepted' }],
      reviews: [
        { id: 'review', rating: '5', comment: 'Good work', created_at: now },
      ],
      escrow_transactions: [
        {
          amount: '1.00',
          contractor_payout: '0.95',
          status: 'completed',
          released_at: now,
        },
      ],
    };
    const builder: Record<string, any> = {};
    for (const key of ['select', 'eq', 'or', 'gte', 'in', 'order'])
      builder[key] = vi.fn(() => builder);
    builder.then = (resolve: Function) =>
      Promise.resolve(
        resolve({
          data: data[table],
          error: table === failedTable ? { message: 'unavailable' } : null,
        })
      );
    builders[table] = builder;
    return builder;
  });
});
it('reports saved reviews and net released earnings with completion/release dates', async () => {
  const result = await GET(
    new NextRequest('https://example.test/api/contractor/reporting?range=7d'),
    {} as never
  );
  const report = await result.json();
  expect(report).toMatchObject({
    completedJobs: 1,
    totalReviews: 1,
    averageRating: 5,
    totalEarnings: 0.95,
  });
  expect(report.monthlyTrend[0]).toMatchObject({ count: 1, earnings: 0.95 });
  expect(builders.escrow_transactions.in).toHaveBeenCalledWith('status', [
    'released',
    'completed',
  ]);
  expect(builders.escrow_transactions.gte.mock.calls[0][0]).toBe('released_at');
  expect(builders.reviews.select).toHaveBeenCalledWith(
    'id, rating, comment, created_at'
  );
});
it('rejects partial data instead of returning false zeroes', async () => {
  failedTable = 'reviews';
  await expect(
    GET(
      new NextRequest('https://example.test/api/contractor/reporting'),
      {} as never
    )
  ).rejects.toThrow('Could not load all report data');
});
