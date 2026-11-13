import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuoteViewDialog } from '@/app/messages/[jobId]/components/QuoteViewDialog';

const network = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));
const response = (body: unknown) => ({ ok: true, json: async () => body });
const quote = (name: string) => ({
  hasQuote: true,
  jobTitle: `${name} work`,
  quote: {
    clientName: name,
    clientEmail: `${name}@example.test`,
    lineItems: [],
    subtotal: 5,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 5,
    quoteDate: '2026-11-13',
    status: 'accepted',
  },
});
beforeEach(() => {
  network.mockReset();
  vi.stubGlobal('fetch', network);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('aborts an old quote and ignores its late result after changing jobs', async () => {
  let resolveOld!: (value: unknown) => void;
  let oldSignal: AbortSignal | undefined;
  network.mockImplementation(async (url: string, options: RequestInit) => {
    if (url === '/api/bids/old-bid/quote') {
      oldSignal = options.signal as AbortSignal;
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    }
    if (url === '/api/bids/new-bid/quote') return response(quote('New client'));
    const old = url.includes('/old');
    return response(
      url.includes('includeBids')
        ? { bids: [{ id: old ? 'old-bid' : 'new-bid', status: 'accepted' }] }
        : { title: old ? 'Old job' : 'New job' }
    );
  });
  const view = render(
    <QuoteViewDialog open jobId='old' onOpenChange={() => {}} />
  );
  await waitFor(() => expect(oldSignal).toBeDefined());
  view.rerender(<QuoteViewDialog open jobId='new' onOpenChange={() => {}} />);
  expect(oldSignal?.aborted).toBe(true);
  await screen.findByText('New client');
  await act(async () => {
    resolveOld(response(quote('Old client')));
  });
  expect(screen.queryByText('Old client')).not.toBeInTheDocument();
  expect(screen.getByText('New client')).toBeInTheDocument();
});

it('does not show an aborted request error or stop a newly opened quote loading', async () => {
  let rejectOld!: (error: Error) => void;
  network.mockImplementation((url: string) => {
    if (url === '/api/jobs/old')
      return new Promise((_resolve, reject) => {
        rejectOld = reject;
      });
    return new Promise(() => {});
  });
  const view = render(
    <QuoteViewDialog open jobId='old' onOpenChange={() => {}} />
  );
  view.rerender(
    <QuoteViewDialog open={false} jobId='old' onOpenChange={() => {}} />
  );
  view.rerender(<QuoteViewDialog open jobId='new' onOpenChange={() => {}} />);
  await act(async () => {
    rejectOld(new Error('Cancelled old request'));
  });
  expect(screen.queryByText('Cancelled old request')).not.toBeInTheDocument();
  expect(screen.getByText('Loading quote...')).toBeInTheDocument();
});
