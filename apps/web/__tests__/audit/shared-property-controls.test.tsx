import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SharedPropertyDetail } from '@/app/properties/[id]/components/SharedPropertyDetail';
vi.mock('@/app/dashboard/components/HomeownerPageWrapper', () => ({
  HomeownerPageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/app/properties/[id]/components/RecurringMaintenance', () => ({
  default: () => <button>Manage recurring maintenance</button>,
}));
vi.mock('@/app/properties/[id]/components/TenantReportingCard', () => ({
  TenantReportingCard: () => <button>Manage tenant reporting links</button>,
}));
const data = {
  property: { id: 'property', name: 'Synthetic property', address: '' },
  jobs: [{ id: 'job', title: 'Inspect boiler', status: 'assigned' }],
  schedules: [],
  certificates: [],
};
it('gives viewers records without owner or mutation controls', () => {
  render(<SharedPropertyDetail {...data} role='viewer' />);
  expect(screen.getByText('Inspect boiler')).toBeTruthy();
  expect(screen.getByText('Assigned')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(
    screen.queryByRole('link', { name: 'Manage certificates' })
  ).toBeNull();
});
it.each(['manager', 'admin'] as const)(
  'gives %s the supported maintenance action without owner controls',
  (role) => {
    render(<SharedPropertyDetail {...data} role={role} />);
    expect(
      screen.getByRole('button', { name: 'Manage recurring maintenance' })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Manage tenant reporting links' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', {
        name: /Edit|Post a job|Manage certificates/,
      })
    ).toBeNull();
  }
);
