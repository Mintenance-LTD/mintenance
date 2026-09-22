import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MintEditorialPropertyTimeline } from '@/app/properties/[id]/components/MintEditorialPropertyTimeline';
it('does not manufacture completion or receipt events from a completed job creation date', () => {
  render(
    <MintEditorialPropertyTimeline
      jobs={[
        {
          id: 'job',
          title: 'Repair tap',
          status: 'completed',
          contractor: 'Synthetic Contractor',
          amount: 100,
          date: '2026-01-01T12:00:00Z',
          category: 'plumbing',
        },
      ]}
    />
  );
  expect(screen.getByText('Repair tap — created')).toBeTruthy();
  expect(screen.getByText('Current status: completed')).toBeTruthy();
  expect(screen.queryByText('Receipt filed')).toBeNull();
  expect(screen.queryByText('Repair tap complete')).toBeNull();
  expect(screen.getByText('Completed job budgets')).toBeTruthy();
});
