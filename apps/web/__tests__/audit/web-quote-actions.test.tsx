import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
import { QuoteDraftActions } from '@/app/contractor/(dashboard)/quotes/components/QuoteDraftActions';
import { QuoteCard } from '@/app/contractor/(dashboard)/quotes/components/QuoteCard';
import type { Quote } from '@/app/contractor/(dashboard)/quotes/components/useQuotesData';
const version = '2026-11-06T12:00:00Z';
const quote: Quote = {
  id: 'quote',
  jobTitle: 'Repair',
  customerName: 'Synthetic client',
  status: 'draft',
  amount: 12,
  createdDate: '2026-11-06',
  expiryDate: null,
  updated_at: version,
};
const response = (status: number, data: unknown) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
beforeEach(() => {
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockResolvedValue(response(200, { success: true }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const card = (status: Quote['status'] = 'draft') =>
  render(
    <QuoteCard
      quote={{ ...quote, status }}
      showActionMenu='quote'
      onToggleMenu={vi.fn()}
    />
  );
it('links review to the real editor and sends the reviewed version', async () => {
  render(<QuoteDraftActions id='quote' version={version} />);
  fireEvent.click(screen.getByText('Edit draft'));
  expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/quote/edit');
  fireEvent.click(screen.getByText('Send to client'));
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Quote sent'));
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({
    quoteId: 'quote',
    expected_updated_at: version,
  });
  expect(screen.getByText('Send to client')).toBeDisabled();
});
it('retains send errors and retries without a false success', async () => {
  mocks.fetch.mockResolvedValueOnce(
    response(500, { error: { message: 'Unavailable' } })
  );
  render(<QuoteDraftActions id='quote' version={version} />);
  fireEvent.click(screen.getByText('Send to client'));
  await screen.findByText('Unavailable');
  expect(mocks.success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Send to client'));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
});
it('blocks another stale send until refreshed quote data arrives', async () => {
  mocks.fetch.mockResolvedValueOnce(response(409, {}));
  const view = render(<QuoteDraftActions id='quote' version={version} />);
  fireEvent.click(screen.getByText('Send to client'));
  await screen.findByText(
    'Quote changed. Review the latest quote before sending.'
  );
  expect(screen.getByText('Send to client')).toBeDisabled();
  expect(mocks.refresh).toHaveBeenCalled();
  view.rerender(
    <QuoteDraftActions id='quote' version='2026-11-06T13:00:00Z' />
  );
  expect(screen.getByText('Send to client')).toBeEnabled();
});
it('blocks double-click sends while awaiting the API', async () => {
  let finish!: (value: unknown) => void;
  mocks.fetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  render(<QuoteDraftActions id='quote' version={version} />);
  fireEvent.click(screen.getByText('Send to client'));
  fireEvent.click(screen.getByText('Sending…'));
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  await act(async () => finish(response(200, { success: true })));
});
it('does not advertise successful duplication, downloading, or deletion from a list stub', () => {
  card();
  expect(screen.queryByText('Duplicate')).toBeNull();
  expect(screen.queryByText('Delete')).toBeNull();
  fireEvent.click(screen.getByText('Create new quote'));
  expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/create');
  fireEvent.click(screen.getByText('View / print quote'));
  expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/quote');
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it.each(['sent', 'viewed', 'accepted', 'rejected', 'expired'] as const)(
  'renders %s cards without edit/send actions',
  (status) => {
    card(status);
    expect(screen.queryByText('Edit Quote')).toBeNull();
    expect(screen.queryByText('Send Quote')).toBeNull();
  }
);
it('sends the list snapshot version and navigates to refreshed details', async () => {
  card();
  fireEvent.click(screen.getByText('Send Quote'));
  await waitFor(() =>
    expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/quote')
  );
  expect(
    JSON.parse(mocks.fetch.mock.calls[0][1].body).expected_updated_at
  ).toBe(version);
});
it('handles structured list send conflicts without a success toast', async () => {
  mocks.fetch.mockResolvedValue(
    response(409, { error: { message: 'Quote changed' } })
  );
  card();
  fireEvent.click(screen.getByText('Send Quote'));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Quote changed')
  );
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.push).toHaveBeenCalledWith('/contractor/quotes/quote');
});
