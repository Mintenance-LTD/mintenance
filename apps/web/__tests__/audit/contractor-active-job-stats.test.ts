import { fetchJobStats } from '@/app/contractor/(dashboard)/jobs/utils/fetchJobs';

describe('contractor active-job statistics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('excludes archived and cancelled work from active counts and booked value, retaining completed history', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jobs: [
            { status: 'assigned', total_amount: 120 },
            { status: 'in_progress', total_amount: 80 },
            {
              status: 'assigned',
              archived_at: '2026-09-30',
              total_amount: 900,
            },
            { status: 'cancelled', total_amount: 700 },
            { status: 'draft', total_amount: 600 },
            { status: 'posted', total_amount: 500 },
            {
              status: 'completed',
              archived_at: '2026-09-30',
              total_amount: 50,
            },
          ],
        }),
      })
    );
    expect(await fetchJobStats()).toEqual({
      active: 2,
      pending: 1,
      completed: 1,
      totalValue: 250,
    });
  });
});
