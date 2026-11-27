// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgencyWorkInbox } from '../../app/agency-work/agency-work-inbox';
import type { Dispatch } from '../../app/agency-work/dispatch-client';
import { PortfolioDispatch } from '../../app/portfolio/portfolio-dispatch';
import { PortfolioLandlordQuoteAccess } from '../../app/portfolio/portfolio-landlord-quote-access';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
const ticketId = 'd6c0469a-fd05-4480-981b-a1b9ca70d349';
const route = '/api/portfolio/tickets/' + ticketId + '/private-dispatch';
const staff: Dispatch = {
  viewer: 'staff',
  ticketId,
  title: 'TEST ONLY Tap repair',
  revision: 3,
  quoteVersion: 1,
  quotePence: 24000,
  quoteScope: 'Replace the leaking tap.',
  approvalLimitPence: 15000,
  decision: null,
  authorization: 'approval_required',
  contractorId: null,
  dispatchedAt: null,
  acceptedAt: null,
};
const reply = (v: unknown, status: number = 200) =>
  new Response(JSON.stringify(v), { status });
afterEach(() => vi.unstubAllGlobals());

describe('agency quote-to-assignment UI', () => {
  it('does not offer assignment above the limit and saves a changed quote as a revision', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ dispatch: staff }))
      .mockResolvedValueOnce(
        reply({
          dispatch: {
            ...staff,
            revision: 4,
            quoteVersion: 2,
            quotePence: 27500,
          },
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<PortfolioDispatch ticketId={ticketId} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Open approval and assignment' })
    );
    expect(
      await screen.findByText(/Landlord approval is required/)
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Assign privately' })
    ).toBeNull();
    fireEvent.change(screen.getByLabelText(/Quote total including/), {
      target: { value: '275' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save quote' }));
    expect(await screen.findByText(/£275.00 · v2/)).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      action: 'quote',
      revision: 3,
      quotePence: 27500,
      quoteScope: 'Replace the leaking tap.',
    });
  });

  it('never assigns an edited but unsaved quote, then instructs the exact approved version privately', async () => {
    const approved = {
      ...staff,
      decision: 'approved',
      authorization: 'landlord_approved',
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ dispatch: approved }))
      .mockResolvedValueOnce(
        reply({
          dispatch: { ...approved, dispatchedAt: '2026-11-27T00:00:00Z' },
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<PortfolioDispatch ticketId={ticketId} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open approval and assignment' })
    );
    const amount = await screen.findByLabelText(/Quote total including/);
    const assign = screen.getByRole('button', {
      name: 'Assign privately',
    }) as HTMLButtonElement;
    fireEvent.change(amount, { target: { value: '275' } });
    expect(assign.disabled).toBe(true);
    fireEvent.change(amount, { target: { value: '240.00' } });
    fireEvent.change(screen.getByLabelText(/Contractor’s existing/), {
      target: { value: 'test-contractor@example.test' },
    });
    fireEvent.click(assign);
    expect(
      await screen.findByText(/Assigned privately to the contractor/)
    ).toBeTruthy();
    expect(fetch.mock.calls[1][0]).toBe(route);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      action: 'dispatch',
      revision: 3,
      quoteVersion: 1,
      contractorEmail: 'test-contractor@example.test',
    });
  });

  it('landlord explicitly approves only the version displayed; a stale revision must reload', async () => {
    const landlord = { ...staff, viewer: 'landlord' };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ items: [landlord, staff] }))
      .mockResolvedValueOnce(reply({}, 409))
      .mockResolvedValueOnce(
        reply({
          items: [
            { ...landlord, quotePence: 27500, quoteVersion: 2, revision: 4 },
          ],
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<AgencyWorkInbox viewer='landlord' />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Review approval' })
    );
    expect(screen.getByText('£240.00 · v1')).toBeTruthy();
    const confirm = screen.getByRole('button', { name: 'Confirm approval' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe(route);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      action: 'approve',
      quoteVersion: 1,
      revision: 3,
    });
    expect(
      screen.queryByRole('button', { name: 'Confirm approval' })
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('£275.00 · Quote v2')).toBeTruthy();
  });

  it('contractor sees private acceptance, never landlord approval controls', async () => {
    const contractor = {
      ...staff,
      viewer: 'contractor',
      authorization: null,
      dispatchedAt: '2026-11-27T00:00:00Z',
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ items: [contractor] }))
      .mockResolvedValueOnce(
        reply({
          dispatch: { ...contractor, acceptedAt: '2026-11-27T00:02:00Z' },
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<AgencyWorkInbox viewer='contractor' />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Review acceptance' })
    );
    expect(
      screen.queryByRole('button', { name: 'Review approval' })
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm acceptance' }));
    expect(
      await screen.findByText('Private work order accepted.')
    ).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[1][1].body).action).toBe('accept');
  });

  it('requires deliberate confirmation before removing an assignment, even on a closed repair', async () => {
    const assigned = {
      ...staff,
      ticketStatus: 'closed',
      quoteVersion: 2,
      dispatchedAt: '2026-11-27T00:00:00Z',
      contractorId: 'private-contractor',
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ dispatch: assigned }))
      .mockResolvedValueOnce(
        reply({
          dispatch: {
            ...assigned,
            revision: 4,
            dispatchedAt: null,
            contractorId: null,
          },
        })
      );
    vi.stubGlobal('fetch', fetch);
    render(<PortfolioDispatch ticketId={ticketId} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open approval and assignment' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Review removing assignment' })
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Save quote' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove assignment' }));
    expect(await screen.findByText(/no longer has access/)).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      action: 'revoke',
      revision: 3,
      quoteVersion: 2,
    });
  });

  it('links and revokes a verified account through separate explicit confirmations', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ linked: false }))
      .mockResolvedValueOnce(reply({ linked: true }))
      .mockResolvedValueOnce(reply({ linked: false }));
    vi.stubGlobal('fetch', fetch);
    render(
      <PortfolioLandlordQuoteAccess
        workspaceId='agency'
        landlordId='landlord'
        landlordName='Test Landlord'
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage landlord quote access' })
    );
    fireEvent.change(await screen.findByLabelText(/Landlord’s existing/), {
      target: { value: 'test-landlord@example.test' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Review account link' })
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Link account' }));
    expect(await screen.findByText(/Quote access linked/)).toBeTruthy();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      landlordEmail: 'test-landlord@example.test',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review removal' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove quote access' })
    );
    await waitFor(() =>
      expect(screen.getByText('Landlord quote access removed.')).toBeTruthy()
    );
    expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({
      landlordEmail: null,
    });
  });
});
