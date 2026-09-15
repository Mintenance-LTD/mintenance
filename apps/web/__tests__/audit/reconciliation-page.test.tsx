import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'synthetic' }),
}));
import Page from '@/app/admin/payments/reconciliation/page';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const ok = (body: unknown) => ({ ok: true, json: async () => body });
const dashboard = {
  records: [],
  stats: {
    total_transactions: 10,
    mismatches_found: 0,
    unresolved_count: 0,
    last_run: '2026-09-15T12:00:00Z',
    last_run_status: 'completed',
    last_run_checked: 3,
    records_limited: false,
  },
};
it('shows a loading failure and retries rather than displaying an all-clear table', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce(ok(dashboard));
  vi.stubGlobal('fetch', fetcher);
  render(<Page />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be loaded'
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry loading records' })
  );
  await waitFor(() =>
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  );
  expect(screen.getByText(/Batch completed/)).toBeInTheDocument();
});
it('reports a failed manual batch without announcing completion', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ok(dashboard))
    .mockResolvedValueOnce({ ok: false });
  vi.stubGlobal('fetch', fetcher);
  render(<Page />);
  await screen.findByText(/Batch completed/);
  fireEvent.click(
    screen.getByRole('button', { name: 'Run Reconciliation Batch' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'did not complete successfully'
  );
  expect(screen.queryByText(/Batch checked/)).not.toBeInTheDocument();
  expect(fetcher.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': 'synthetic' },
  });
});
it('reports only the confirmed batch size, then reloads persistent run history', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ok(dashboard))
    .mockResolvedValueOnce(ok({ checked: 3 }))
    .mockResolvedValueOnce(ok(dashboard));
  vi.stubGlobal('fetch', fetcher);
  render(<Page />);
  await screen.findByText(/Batch completed/);
  fireEvent.click(
    screen.getByRole('button', { name: 'Run Reconciliation Batch' })
  );
  expect(
    await screen.findByText(/Batch checked 3 payments/)
  ).toBeInTheDocument();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
});

it('navigates forward/back and resets the cursor when switching filters', async () => {
  const first = { ...dashboard, pagination: { next_cursor: 'next-token' } };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ok(first))
    .mockResolvedValueOnce(ok(dashboard))
    .mockResolvedValueOnce(ok(first))
    .mockResolvedValueOnce(ok(dashboard));
  vi.stubGlobal('fetch', fetcher);
  render(<Page />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() =>
    expect(fetcher.mock.calls[1][0]).toContain('cursor=next-token')
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  expect(fetcher.mock.calls[2][0]).not.toContain('cursor=');
  fireEvent.click(screen.getByRole('button', { name: 'Filter all records' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
  expect(fetcher.mock.calls[3][0]).toBe('/api/admin/reconciliation?filter=all');
});
it('ignores a delayed response from the previous filter', async () => {
  let resolveOld!: (value: unknown) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    )
    .mockResolvedValueOnce(ok(dashboard));
  vi.stubGlobal('fetch', fetcher);
  render(<Page />);
  fireEvent.click(screen.getByRole('button', { name: 'Filter all records' }));
  await screen.findByText(/Batch completed/);
  await act(async () =>
    resolveOld(
      ok({
        ...dashboard,
        stats: { ...dashboard.stats, total_transactions: 999 },
      })
    )
  );
  expect(screen.queryByText('999')).not.toBeInTheDocument();
});
