// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortfolioAgencyLandlords } from '../../app/portfolio/portfolio-agency-landlords';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));

const workspaceId = 'qa-agency';
const endpoint = '/api/organizations/qa-agency/agency-landlords';
const directory = {
  landlords: [],
  properties: [
    { id: 'p1', name: 'TEST ONLY Property', landlordId: null },
    { id: 'p2', name: 'Already managed', landlordId: 'other' },
  ],
  staff: [
    { id: 'm1', name: 'TEST Primary' },
    { id: 'm2', name: 'TEST Backup' },
  ],
  canEdit: true,
};
const reply = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
afterEach(() => vi.unstubAllGlobals());

describe('Portfolio landlord directory', () => {
  it('records staff roles, a property and the approval limit without sharing access', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply(directory))
      .mockImplementationOnce(async (_: string, init: RequestInit) =>
        reply({
          landlord: { ...JSON.parse(String(init.body)), id: 'l1', revision: 1 },
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<PortfolioAgencyLandlords workspaceId={workspaceId} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open landlord directory' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add landlord' })
    );
    expect(
      (
        screen.getByRole('checkbox', {
          name: /already managed/i,
        }) as HTMLInputElement
      ).disabled
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('Landlord or company name'), {
      target: { value: 'TEST Landlord' },
    });
    fireEvent.change(screen.getByLabelText('Works authorisation limit (£)'), {
      target: { value: '150.00' },
    });
    fireEvent.change(screen.getByLabelText('Primary manager'), {
      target: { value: 'm1' },
    });
    fireEvent.change(screen.getByLabelText('Backup manager'), {
      target: { value: 'm2' },
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'TEST ONLY Property' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save landlord' }));
    expect(
      await screen.findByText(
        'Landlord saved. No invitation or message was sent.'
      )
    ).toBeDefined();
    expect(screen.getByText('£150.00')).toBeDefined();
    expect(fetch.mock.calls[1][0]).toBe(endpoint);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      displayName: 'TEST Landlord',
      approvalLimitPence: 15000,
      primaryManagerId: 'm1',
      backupManagerId: 'm2',
      propertyIds: ['p1'],
    });
  });

  it('does not show an edit action in a read-only directory', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply({ ...directory, canEdit: false }))
    );
    render(<PortfolioAgencyLandlords workspaceId={workspaceId} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open landlord directory' })
    );
    expect(
      await screen.findByText('No landlords have been added yet.')
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Add landlord' })).toBeNull();
  });
});
