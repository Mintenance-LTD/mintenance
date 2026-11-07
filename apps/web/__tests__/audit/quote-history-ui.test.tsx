import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { QuoteHistoryClient } from '@/app/contractor/(dashboard)/quotes/[id]/history/QuoteHistoryClient';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), confirm: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => mocks.confirm,
}));
vi.mock('@/lib/hooks/useCSRF', () => ({
  fetchWithCSRF: (...args: Parameters<typeof fetch>) => fetch(...args),
}));
const quote = {
  id: 'quote',
  title: 'Repair',
  status: 'accepted',
  total_amount: 100,
  updated_at: '2026-11-06T12:00:00.123456Z',
  line_items: [{ description: 'Part', quantity: 1.5, unitPrice: 10.01 }],
};
const response = (status: number, data: unknown) => ({
  status,
  ok: status < 400,
  json: async () => data,
});
const history = (
  revisions: unknown[] = [],
  next_before: number | null = null
) => response(200, { revisions, next_before });
const revision = {
  id: 'revision',
  revision_number: 1,
  kind: 'amendment_proposed',
  reason: 'New work',
  actor_id: 'owner',
  created_at: '2026-11-06T12:00:00Z',
  before_snapshot: { total_amount: 100, status: 'accepted', line_items: null },
  after_snapshot: {
    total_amount: 18.02,
    status: 'proposal',
    line_items: [
      { description: 'Part', quantity: 1.5, unitPrice: 10.01, total: 15.02 },
    ],
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockResolvedValue(history());
  mocks.confirm.mockResolvedValue(false);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const open = async (status = 'accepted') => {
  const view = render(<QuoteHistoryClient quote={{ ...quote, status }} />);
  await screen.findByText(/No revisions recorded/);
  return view;
};
const prepare = async () => {
  await open();
  fireEvent.click(screen.getByText('Prepare amendment proposal'));
  fireEvent.change(screen.getByLabelText('Reason for amendment'), {
    target: { value: 'New work' },
  });
  fireEvent.change(screen.getByLabelText('Tax (%)'), {
    target: { value: '20' },
  });
};
it('does not offer amendment preparation for a draft/sent quote', async () => {
  await open('sent');
  expect(screen.queryByText('Prepare amendment proposal')).toBeNull();
});
it('does not infer tax from an accepted historical total', async () => {
  await open();
  fireEvent.click(screen.getByText('Prepare amendment proposal'));
  expect(screen.getByLabelText('Tax (%)')).toHaveValue('');
  fireEvent.click(screen.getByText('Save amendment proposal'));
  expect(await screen.findByRole('alert')).toHaveTextContent('reason');
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
it('saves a versioned proposal and shows the preserved accepted price and new history', async () => {
  await prepare();
  mocks.fetch
    .mockResolvedValueOnce(response(200, { success: true, revision }))
    .mockResolvedValueOnce(history([revision]));
  expect(screen.getByText('New total: £18.02')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Save amendment proposal'));
  await screen.findByText(/Amendment proposal saved/);
  expect(
    screen.getByText(/Current recorded total: £100.00/)
  ).toBeInTheDocument();
  expect(JSON.parse(mocks.fetch.mock.calls[1][1].body)).toEqual({
    request_id: expect.any(String),
    expected_updated_at: quote.updated_at,
    reason: 'New work',
    pricing: { line_items: quote.line_items, tax_rate_percent: 20 },
  });
  expect(
    await screen.findByText('Revision 1: Prepared amendment proposal')
  ).toBeInTheDocument();
  expect(screen.getByText('Accepted quote')).toBeInTheDocument();
});
it('retries a lost response with the identical key/payload and retains frozen inputs', async () => {
  await prepare();
  mocks.fetch.mockRejectedValueOnce(new Error('Network interrupted'));
  fireEvent.click(screen.getByText('Save amendment proposal'));
  await screen.findByText('Retry same proposal');
  expect(screen.getByLabelText('Reason for amendment')).toBeDisabled();
  const body = mocks.fetch.mock.calls[1][1].body;
  mocks.fetch
    .mockResolvedValueOnce(response(200, { success: true, revision }))
    .mockResolvedValueOnce(history([revision]));
  fireEvent.click(screen.getByText('Retry same proposal'));
  await screen.findByText(/Amendment proposal saved/);
  expect(mocks.fetch.mock.calls[2][1].body).toBe(body);
});
it('blocks a second concurrent save', async () => {
  await prepare();
  let resolve!: (value: unknown) => void;
  mocks.fetch.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  fireEvent.click(screen.getByText('Save amendment proposal'));
  fireEvent.click(screen.getByText('Saving…'));
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  await act(async () => resolve(response(200, { success: true, revision })));
});
it('blocks stale proposals until the user reviews the quote again', async () => {
  await prepare();
  mocks.fetch.mockResolvedValueOnce(
    response(409, { error: { message: 'Quote changed' } })
  );
  fireEvent.click(screen.getByText('Save amendment proposal'));
  await screen.findByText('Quote changed');
  expect(screen.queryByText('Save amendment proposal')).toBeNull();
  expect(screen.queryByText('Retry same proposal')).toBeNull();
  expect(screen.getByLabelText('Tax (%)')).toBeDisabled();
});
it('keeps the loaded version during a background prop refresh', async () => {
  const view = await open();
  fireEvent.click(screen.getByText('Prepare amendment proposal'));
  fireEvent.change(screen.getByLabelText('Reason for amendment'), {
    target: { value: 'New work' },
  });
  fireEvent.change(screen.getByLabelText('Tax (%)'), {
    target: { value: '0' },
  });
  view.rerender(
    <QuoteHistoryClient
      quote={{ ...quote, updated_at: '2026-11-07T00:00:00Z' }}
    />
  );
  mocks.fetch.mockResolvedValueOnce(response(200, { success: true, revision }));
  fireEvent.click(screen.getByText('Save amendment proposal'));
  await screen.findByText(/Amendment proposal saved/);
  expect(
    JSON.parse(mocks.fetch.mock.calls[1][1].body).expected_updated_at
  ).toBe(quote.updated_at);
});
it('shows a recoverable history failure instead of a false empty state', async () => {
  mocks.fetch.mockResolvedValueOnce(
    response(500, { error: 'History unavailable' })
  );
  render(<QuoteHistoryClient quote={quote} />);
  await screen.findByText('History unavailable');
  expect(screen.queryByText(/No revisions recorded/)).toBeNull();
  expect(screen.getByText('Prepare amendment proposal')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry history'));
  await screen.findByText(/No revisions recorded/);
});
it('loads older history without hiding newer entries', async () => {
  mocks.fetch.mockResolvedValueOnce(
    history([{ ...revision, id: 'new', revision_number: 2 }], 2)
  );
  mocks.fetch.mockResolvedValueOnce(history([revision]));
  render(<QuoteHistoryClient quote={quote} />);
  fireEvent.click(await screen.findByText('Load older revisions'));
  await waitFor(() =>
    expect(mocks.fetch).toHaveBeenLastCalledWith(
      '/api/contractor/quotes/quote/revisions?before=2',
      { cache: 'no-store' }
    )
  );
  expect(screen.getByText(/Revision 2:/)).toBeInTheDocument();
  expect(await screen.findByText(/Revision 1:/)).toBeInTheDocument();
});
it('allows correction after validation fails and does not reuse a rejected request', async () => {
  await prepare();
  mocks.fetch.mockResolvedValueOnce(
    response(400, { error: 'Review the price' })
  );
  fireEvent.click(screen.getByText('Save amendment proposal'));
  await screen.findByText('Review the price');
  expect(screen.getByLabelText('Tax (%)')).not.toBeDisabled();
  const rejected = JSON.parse(mocks.fetch.mock.calls[1][1].body);
  fireEvent.change(screen.getByLabelText('Tax (%)'), {
    target: { value: '0' },
  });
  mocks.fetch.mockResolvedValueOnce(response(200, { success: true, revision }));
  fireEvent.click(screen.getByText('Save amendment proposal'));
  await screen.findByText(/Amendment proposal saved/);
  const corrected = JSON.parse(mocks.fetch.mock.calls[2][1].body);
  expect(corrected.request_id).not.toBe(rejected.request_id);
  expect(corrected.pricing.tax_rate_percent).toBe(0);
});
it('asks before leaving an active proposal', async () => {
  await prepare();
  fireEvent.click(screen.getByText('Back to quote'));
  await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
  expect(screen.getByLabelText('Reason for amendment')).toHaveValue('New work');
});
it('preserves historical pricing without advertising another amendment on a superseded quote', async () => {
  mocks.fetch.mockResolvedValueOnce(
    history([{ ...revision, amendment: { status: 'applied' } }])
  );
  render(
    <QuoteHistoryClient
      quote={{ ...quote, job_id: 'job', is_current: false }}
    />
  );
  await screen.findByText('Customer review: applied');
  expect(screen.queryByText('Submit for customer review')).toBeNull();
  expect(screen.queryByText('Prepare amendment proposal')).toBeNull();
  expect(screen.getByText(/This is a historical quote/)).toBeInTheDocument();
});
