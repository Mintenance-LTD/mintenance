import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
import { OpenJobDispute } from '@/app/jobs/[id]/review/OpenJobDispute';
beforeEach(() => push.mockClear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('uses the fetched escrow reference rather than the job ID', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ escrow: { id: 'actual-escrow', jobId: 'job' } })
      )
    );
  vi.stubGlobal('fetch', fetchMock);
  render(<OpenJobDispute jobId='job' />);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith('/disputes/create?escrowId=actual-escrow')
  );
  expect(fetchMock).toHaveBeenCalledWith('/api/jobs/job/escrow', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
});
it.each([null, { id: 'other-escrow', jobId: 'other-job' }])(
  'does not navigate with missing or mismatched payment data',
  async (escrow) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ escrow })))
    );
    render(<OpenJobDispute jobId='job' />);
    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('alert');
    expect(push).not.toHaveBeenCalled();
  }
);
it('offers retry after a failed payment lookup', async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('Connection interrupted'))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ escrow: { id: 'escrow', jobId: 'job' } }))
    );
  vi.stubGlobal('fetch', fetchMock);
  render(<OpenJobDispute jobId='job' />);
  fireEvent.click(screen.getByRole('button'));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith('/disputes/create?escrowId=escrow')
  );
});
