// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgencyDashboardStart } from '../../app/dashboard/components/AgencyDashboardStart';

const preference = vi.hoisted(() => ({
  enabled: true,
  ready: true,
  view: 'home',
  accountId: 'test-owner',
}));
vi.mock('@/hooks/usePropertyView', () => ({
  usePropertyView: () => preference,
}));

afterEach(() => vi.unstubAllGlobals());
const show = (data: unknown, status = 200) => {
  preference.accountId = 'test-owner';
  preference.view = 'agency';
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status }))
  );
  return render(<AgencyDashboardStart />);
};

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

  it('opens the exact CRM workspace, not an unrelated first workspace', async () => {
    show({
      workspaces: [
        { id: 'viewer-only', role: 'viewer' },
        { id: 'agency-one', role: 'maintenance_coordinator' },
      ],
    });
    expect(screen.queryByRole('link', { name: 'CRM' })).toBeNull();
    expect(await screen.findByRole('link', { name: 'CRM' })).toHaveAttribute(
      'href',
      '/portfolio?orgId=agency-one&view=crm'
    );
    expect(screen.getByRole('link', { name: 'Action queue' })).toHaveAttribute(
      'href',
      '/properties/work-queue'
    );
  });

  it.each([
    { workspaces: [] },
    { workspaces: [{ id: 'one', role: 'viewer' }] },
  ])(
    'does not imply CRM access for shared-only or ineligible accounts',
    async (data) => {
      show(data);
      expect(await screen.findByText(/ask its workspace owner/)).toBeVisible();
      expect(screen.queryByRole('link', { name: 'CRM' })).toBeNull();
      expect(screen.getByRole('link', { name: 'Properties' })).toBeVisible();
    }
  );

  it('labels setup separately when allowed and an owned property is available', async () => {
    show({
      workspaces: [],
      canSetUp: true,
      unlinkedProperties: [{ id: 'owned' }],
    });
    expect(
      await screen.findByRole('link', { name: 'Set up an Agency workspace' })
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'CRM' })).toBeNull();
  });

  it('hides the previous account’s shortcut while rechecking workspace access', async () => {
    const page = show({ workspaces: [{ id: 'one', role: 'owner' }] });
    expect(await screen.findByRole('link', { name: 'CRM' })).toBeVisible();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 500 }))
    );
    preference.accountId = 'test-other';
    page.rerender(<AgencyDashboardStart />);
    expect(screen.queryByRole('link', { name: 'CRM' })).toBeNull();
    await waitFor(() =>
      expect(screen.getByText(/could not be checked/)).toBeVisible()
    );
    expect(screen.queryByRole('link', { name: 'CRM' })).toBeNull();
  });
});
