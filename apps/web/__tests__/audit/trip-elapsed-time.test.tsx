import { act, cleanup, render, screen } from '@testing-library/react';
import { OnMyWayButton } from '@/app/contractor/(dashboard)/jobs/[id]/components/OnMyWayButton';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('updates the trip elapsed label without another interaction', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-13T10:00:00Z'));
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          trips: [
            {
              id: 'trip',
              job_id: 'job',
              status: 'en_route',
              started_at: '2026-11-13T10:00:00Z',
            },
          ],
        }),
      })
  );
  await act(async () => {
    render(<OnMyWayButton jobId='job' contractorId='contractor' />);
  });
  expect(screen.getByText('0 min elapsed')).toBeInTheDocument();
  await act(async () => {
    vi.advanceTimersByTime(60_000);
  });
  expect(screen.getByText('1 min elapsed')).toBeInTheDocument();
});
