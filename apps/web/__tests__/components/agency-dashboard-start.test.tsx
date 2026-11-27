// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgencyDashboardStart } from '../../app/dashboard/components/AgencyDashboardStart';

const preference = vi.hoisted(() => ({
  enabled: true,
  ready: true,
  view: 'home',
}));
vi.mock('@/hooks/usePropertyView', () => ({
  usePropertyView: () => preference,
}));

describe('existing homeowner Agency view', () => {
  it.each(['home', 'rentals'])(
    'does not add agency navigation to %s',
    (view) => {
      preference.view = view;
      render(<AgencyDashboardStart />);
      expect(
        screen.queryByRole('link', { name: 'Open Agency workspace' })
      ).toBeNull();
      expect(screen.queryByRole('link', { name: 'CRM' })).toBeNull();
    }
  );

  it('uses the existing Portfolio workspace without removing the action queue', () => {
    preference.view = 'agency';
    render(<AgencyDashboardStart />);
    expect(
      screen
        .getByRole('link', { name: 'Open Agency workspace' })
        .getAttribute('href')
    ).toBe('/portfolio');
    expect(
      screen.getByRole('link', { name: 'Action queue' }).getAttribute('href')
    ).toBe('/properties/work-queue');
    expect(screen.getByRole('link', { name: 'CRM' }).getAttribute('href')).toBe(
      '/portfolio?view=crm'
    );
  });
});
