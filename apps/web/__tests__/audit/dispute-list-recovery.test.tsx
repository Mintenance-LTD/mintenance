import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
vi.unmock('@tanstack/react-query');
import { DisputesClient } from '@/app/admin/disputes/components/DisputesClient';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('distinguishes lookup failure from empty disputes and retries the fetch', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Database unavailable' }), {
        status: 500,
      })
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          stats: { open: 0, reviewing: 0, resolved: 0, totalAmountAtRisk: 0 },
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
      )
    );
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <DisputesClient />
    </QueryClientProvider>
  );
  await screen.findByRole('alert');
  expect(screen.queryByText('No Disputes Found')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry loading disputes' })
  );
  await screen.findByText('No Disputes Found');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  client.clear();
});

it('shows an overdue decision separately from the held £1.20 and offers only the exact case link', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{
    id: 'escrow-qa', jobId: 'job-qa', jobTitle: 'Test repair', amount: 1.20,
    escrowStatus: 'disputed', adminHoldStatus: 'pending_review', slaDeadline: '2020-11-24T12:00:00Z',
    assignedAdmin: 'Assigned operator', homeownerEmail: 'private@example.invalid',
  }] }))));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <DisputesClient />
  </QueryClientProvider>);
  expect(await screen.findByText('Overdue · pending review')).toBeInTheDocument();
  expect(screen.getByText('24 Nov 2020')).toBeInTheDocument();
  expect(screen.getByText('£1.20')).toBeInTheDocument();
  expect(screen.getByText('Held for dispute · release blocked')).toBeInTheDocument();
  expect(screen.getByText('Assigned operator')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open case for Test repair' })).toHaveAttribute('href', '/admin/disputes/escrow-qa');
  expect(screen.queryByText('private@example.invalid')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /resolve dispute|place on hold/i })).not.toBeInTheDocument();
});
