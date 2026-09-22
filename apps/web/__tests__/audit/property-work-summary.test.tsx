import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PropertyWorkSummary } from '@/app/properties/[id]/components/PropertyWorkSummary';
it('shows operational statuses without claiming condition and filters terminal jobs', () => {
  render(
    <PropertyWorkSummary
      jobs={[
        { id: 'assigned-job', title: 'Repair tap', status: 'assigned' },
        { id: 'done-job', title: 'Repair door', status: 'completed' },
        { id: 'draft-job', title: 'Draft repair', status: 'draft' },
      ]}
    />
  );
  expect(screen.getByText('Assigned')).toBeTruthy();
  expect(screen.queryByText('Repair door')).toBeNull();
  expect(screen.queryByText('Critical')).toBeNull();
  expect(
    screen
      .getByRole('link', { name: 'Repair tap Assigned' })
      .getAttribute('href')
  ).toBe('/jobs/assigned-job');
  fireEvent.click(screen.getByRole('button', { name: 'All jobs (3)' }));
  expect(screen.getByText('Repair door')).toBeTruthy();
  expect(screen.getByText('Draft')).toBeTruthy();
});
it('does not turn missing history into a physical risk claim', () => {
  render(<PropertyWorkSummary jobs={[]} />);
  expect(screen.getByText('No open jobs recorded.')).toBeTruthy();
  expect(screen.queryByText(/immediate attention/i)).toBeNull();
});
