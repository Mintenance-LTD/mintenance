import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, { user: { id: 'contractor-a', role: 'contractor' } }),
}));
vi.mock('@/lib/api/job-storage', () => ({ resignJobStorageUrls: vi.fn() }));
import { GET } from '@/app/api/contractor/my-jobs/route';
let bids: Record<string, ReturnType<typeof vi.fn>>;
let jobs: Record<string, ReturnType<typeof vi.fn>>;
beforeEach(() => {
  vi.clearAllMocks();
  const builder = (data: unknown[]) => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const key of ['select', 'eq', 'in', 'is', 'order'])
      query[key] = vi.fn(() => query);
    query.then = vi.fn((resolve) => resolve({ data, error: null }));
    return query;
  };
  bids = builder([{ job_id: 'job-a', status: 'rejected' }]);
  jobs = builder([
    {
      id: 'job-a',
      title: 'Private homeowner contact',
      status: 'assigned',
      homeowner_id: 'homeowner-a',
      created_at: '2026-11-01',
      photos: [],
      homeowner: {
        first_name: 'Owner',
        last_name: 'Example',
        email: 'private@example.test',
        phone: '07000000000',
        profile_image_url: null,
      },
    },
  ]);
  mocks.from.mockImplementation((table) => (table === 'bids' ? bids : jobs));
});
it('keeps rejected-bid history scoped to the caller without disclosing homeowner contact fields', async () => {
  const response = await GET(
    new NextRequest('http://localhost/api/contractor/my-jobs?status=bid'),
    {} as never
  );
  expect(response.status).toBe(200);
  expect(bids.eq).toHaveBeenCalledWith('contractor_id', 'contractor-a');
  expect(jobs.in).toHaveBeenCalledWith('id', ['job-a']);
  const row = (await response.json()).jobs[0];
  expect(row.bid_status).toBe('rejected');
  expect(row.homeowner).toEqual({
    first_name: 'Owner',
    last_name: 'Example',
    profile_image_url: null,
  });
  expect(jobs.select.mock.calls[0][0]).not.toMatch(/\b(?:email|phone)\b/);
});
