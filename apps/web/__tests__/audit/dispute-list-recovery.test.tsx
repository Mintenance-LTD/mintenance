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
