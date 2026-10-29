import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GuideHub } from './GuideHub';
vi.mock('./EarlyAccessSummary', () => ({ EarlyAccessSummary: () => null }));
vi.mock('@/hooks/useJourneyProgress', () => ({
  useJourneyProgress: () => ({
    progress: null,
    loaded: true,
    error: null,
    save: vi.fn(),
    retry: vi.fn(),
  }),
}));
afterEach(cleanup);
it.each([
  ['homeowner', 'homeowner', 'Properties, rooms and history'],
  ['homeowner', 'landlord', 'Portfolio compliance and work queue'],
  ['homeowner', 'agency', 'Agency teams, bulk work and reports'],
  ['homeowner', 'tenant', 'Your property invitation'],
  ['contractor', 'contractor', 'Set up your business'],
  ['contractor', 'team-member', 'Join your contractor team'],
  ['admin', 'admin', 'Admin security and audit trail'],
])(
  'opens the %s / %s journey at the relevant first action',
  (role, persona, title) => {
    render(<GuideHub userId='test' role={role} initialPersona={persona} />);
    expect(screen.getByRole('region', { name: title })).toBeTruthy();
  }
);
it('lets a homeowner select a tenant journey without showing owner setup', () => {
  render(<GuideHub userId='test' role='homeowner' />);
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'tenant' },
  });
  expect(
    screen.getByRole('region', { name: 'Your property invitation' })
  ).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: /Properties, rooms/ })
  ).toBeNull();
});
