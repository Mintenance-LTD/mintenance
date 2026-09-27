import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoveryHealthCard } from '@/app/admin/components/RecoveryHealthCard';
import { recoveryJobs } from '@/lib/operations/recovery-status';
vi.unmock('@tanstack/react-query');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('hides previously successful rows after a failed refresh and offers a retry', async () => {
  const report = {
    checkedAt: '2026-09-27T12:00:00.000Z',
    jobs: recoveryJobs.map((job) => ({
      ...job,
      state: 'recent_success',
      lastStartedAt: null,
      lastSuccessAt: null,
    })),
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => report })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...report,
        jobs: report.jobs.map((job) => ({ ...job, state: 'missing' })),
      }),
    });
  vi.stubGlobal('fetch', fetchMock);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <RecoveryHealthCard />
    </QueryClientProvider>
  );
  expect(await screen.findAllByText('Recent run completed')).toHaveLength(9);
  fireEvent.click(
    screen.getByRole('button', { name: 'Refresh recovery status' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be verified'
  );
  expect(screen.queryByText('Recent run completed')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Refresh recovery status' })
  );
  expect(await screen.findAllByText('No recorded run')).toHaveLength(9);
  client.clear();
});
