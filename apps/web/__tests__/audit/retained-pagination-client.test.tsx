import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Page from '@/app/disputes/page';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const row = (suffix: string) => ({
  escrow_id: `aaaaaaaa-aaaa-4aaa-8aaa-${suffix}`,
  archived_at: '2026-09-24T12:00:00+00:00',
});
it('retries the failed cursor and appends older records without duplicate links', async () => {
  const first = row('aaaaaaaaaaaa'),
    older = row('bbbbbbbbbbbb');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [first], nextCursor: 'older' }),
    })
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [first, older], nextCursor: null }),
    });
  vi.stubGlobal('fetch', fetchMock);
  render(<Page />);
  fireEvent.click(await screen.findByText('Load older records'));
  fireEvent.click(await screen.findByText('Retry'));
  expect(await screen.findAllByRole('link')).toHaveLength(2);
  expect(fetchMock.mock.calls.slice(1).map((call) => call[0])).toEqual([
    '/api/disputes/retained?cursor=older',
    '/api/disputes/retained?cursor=older',
  ]);
  expect(screen.queryByText('Load older records')).toBeNull();
});
it('rejects a malformed response instead of navigating to an arbitrary record', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [{ escrow_id: '../admin', archived_at: 'today' }],
      }),
    })
  );
  render(<Page />);
  await screen.findByText('Retry');
  expect(screen.queryByRole('link')).toBeNull();
});
