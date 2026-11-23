import { cleanup, render, screen } from '@testing-library/react';
import { MintEditorialJobsPanel } from '@/app/dashboard/components/mint-editorial/MintEditorialJobsPanel';
afterEach(cleanup);
it.each([
  ['posted', 3, 'Compare bids'],
  ['pending', 2, 'Compare bids'],
  ['posted', 0, 'View details'],
  ['assigned', 3, 'Review upcoming work'],
  ['in_progress', 3, 'Track progress'],
  ['completed', 3, 'Review completed work'],
  ['cancelled', 3, 'View details'],
])(
  'shows the current action for %s with %s historical bids',
  (status, bidsCount, action) => {
    render(
      <MintEditorialJobsPanel
        activeJobs={[
          {
            id: 'job-1',
            title: 'Synthetic repair',
            status: String(status),
            bidsCount: Number(bidsCount),
            budget: 100,
            progress: 0,
          },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: String(action) })).toHaveAttribute(
      'href',
      '/jobs/job-1'
    );
    if (status !== 'posted' && status !== 'pending')
      expect(screen.queryByRole('link', { name: 'Compare bids' })).toBeNull();
  }
);
