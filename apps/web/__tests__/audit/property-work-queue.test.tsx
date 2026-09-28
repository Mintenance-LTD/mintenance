import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PropertyWorkQueue } from '@/app/properties/[id]/components/PropertyWorkQueue';
it('starts with open work, filters by contractor, and keeps completed records reachable', () => {
  render(
    <PropertyWorkQueue
      jobs={[
        {
          id: 'open',
          title: 'Repair the tap',
          status: 'posted',
          contractor: null,
        },
        {
          id: 'assigned',
          title: 'Repair a door',
          status: 'assigned',
          contractor: 'Synthetic contractor',
        },
        {
          id: 'done',
          title: 'Completed inspection',
          status: 'completed',
          contractor: 'Previous contractor',
        },
      ]}
    />
  );
  expect(
    screen.queryByRole('link', { name: 'Completed inspection' })
  ).toBeNull();
  fireEvent.change(screen.getByLabelText('Search work or contractor'), {
    target: { value: 'Synthetic' },
  });
  expect(
    screen.getByRole('link', { name: 'Repair a door' }).getAttribute('href')
  ).toBe('/jobs/assigned');
  expect(screen.queryByRole('link', { name: 'Repair the tap' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Search work or contractor'), {
    target: { value: '' },
  });
  fireEvent.change(screen.getByLabelText('Work status'), {
    target: { value: 'all' },
  });
  expect(
    screen.getByRole('link', { name: 'Completed inspection' })
  ).toBeDefined();
});
it('reveals additional matching work without dropping records', () => {
  render(
    <PropertyWorkQueue
      jobs={Array.from({ length: 11 }, (_, index) => ({
        id: String(index),
        title: `Job ${index}`,
        status: 'posted',
      }))}
    />
  );
  expect(screen.queryByRole('link', { name: 'Job 10' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show more jobs' }));
  expect(screen.getByRole('link', { name: 'Job 10' })).toBeDefined();
});
