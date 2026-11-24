import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { QuoteAmendmentReview } from '@/components/quotes/QuoteAmendmentReview';
import { PublishQuoteAmendment } from '@/components/quotes/PublishQuoteAmendment';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  read: vi.fn(),
  post: vi.fn(),
  csrf: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => mocks.confirm,
}));
const amendment = {
  id: 'revision',
  sequence: 1,
  version: 1,
  status: 'published',
  reason: 'Additional repair',
  applied_quote_id: null,
  before_snapshot: {
    line_items: [
      { description: 'Part', quantity: 1, unitPrice: 100, total: 100 },
    ],
    subtotal: 100,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 100,
  },
  after_snapshot: {
    line_items: [
      { description: 'Part', quantity: 2, unitPrice: 60, total: 120 },
    ],
    subtotal: 120,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 120,
  },
  events: [
    {
      version: 1,
      action: 'publish',
      note: '',
      created_at: '2026-11-06T12:00:00Z',
    },
  ],
};
const response = (status: number, data: unknown) => ({
  status,
  ok: status < 400,
  json: async () => data,
});
const page = (row = amendment, contractor = false, context = {}) =>
  response(200, {
    amendments: [row],
    can_approve: !contractor,
    is_contractor: contractor,
    next_before: null,
    agreed_total: 100,
    ...context,
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.confirm.mockResolvedValue(true);
  mocks.csrf.mockResolvedValue(response(200, { token: 'csrf-test-token' }));
  mocks.read.mockResolvedValue(page());
  mocks.post.mockResolvedValue(
    response(200, {
      amendment: { ...amendment, status: 'approved', version: 2 },
    })
  );
  mocks.fetch.mockImplementation((url: string, options?: RequestInit) =>
    url === '/api/csrf'
      ? mocks.csrf()
      : options?.method === 'POST'
        ? mocks.post(url, options)
        : mocks.read(url)
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const open = async () => {
  render(<QuoteAmendmentReview jobId='job' />);
  await screen.findByRole('heading', { name: 'Amendment 1', exact: true });
};
const review = () => fireEvent.click(screen.getByRole('checkbox'));
it('shows signed or funded history up front and removes decision actions', async () => {
  mocks.read.mockResolvedValue(
    page(amendment, false, { history_only: 'signed_or_funded' })
  );
  await open();
  expect(
    screen.getByRole('heading', {
      name: 'History only: this agreement is already signed or funded',
    })
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Approve proposal' })).toBeNull();
});
it('shows the live agreed total, proposed total, difference and responsible person', async () => {
  mocks.read.mockResolvedValue(
    page(amendment, false, { agreed_total: 100.75 })
  );
  await open();
  const summary = within(
    screen.getByRole('region', { name: 'Pricing and next step' })
  );
  expect(summary.getByText('£100.75')).toBeVisible();
  expect(summary.getByText('£120.00')).toBeVisible();
  expect(summary.getByText('+£19.25')).toBeVisible();
  expect(summary.getByText(/Your turn to review/)).toBeVisible();
});
it.each([false, true])(
  'shows the same exact applied agreement to each side (contractor: %s)',
  async (contractor) => {
    mocks.read.mockResolvedValue(
      response(200, {
        amendments: [
          {
            ...amendment,
            status: 'applied',
            version: 3,
            applied_quote_id: 'new',
          },
        ],
        current_agreement: {
          id: 'contract',
          quote_id: 'new',
          version: 2,
          total: 120,
          status: 'draft',
        },
        can_approve: !contractor,
        is_contractor: contractor,
      })
    );
    await open();
    expect(
      screen.getByRole('heading', { name: 'Revised contract · Version 2' })
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Review revised contract' })
    ).toHaveAttribute(
      'href',
      '/jobs/job/amendments/agreement?contract=contract&quote=new&version=2'
    );
  }
);
it('does not link an older applied amendment to a newer agreement', async () => {
  mocks.read.mockResolvedValue(
    response(200, {
      amendments: [
        { ...amendment, status: 'applied', applied_quote_id: 'old' },
      ],
      current_agreement: {
        id: 'contract',
        quote_id: 'new',
        version: 3,
        total: 130,
        status: 'draft',
      },
    })
  );
  await open();
  expect(
    screen.queryByRole('link', { name: 'Review revised contract' })
  ).toBeNull();
});
it('explains withdrawn pricing without offering an approval or application', async () => {
  mocks.read.mockResolvedValue(
    page({ ...amendment, status: 'withdrawn', version: 2 })
  );
  await open();
  expect(screen.getByText('withdrawn', { exact: true })).toBeInTheDocument();
  expect(
    screen.getByText(
      'This proposal was withdrawn. Its proposed pricing was not applied.'
    )
  ).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(
    screen.queryByRole('button', {
      name: /Approve proposal|Apply approved pricing|Withdraw proposal/,
    })
  ).toBeNull();
  fireEvent.click(screen.getByText('Decision history'));
  expect(screen.getByText('publish', { exact: true })).toBeInTheDocument();
});
it('keeps missing historical amounts distinct from zero and retains full item descriptions and terms', async () => {
  mocks.read.mockResolvedValue(
    page({
      ...amendment,
      before_snapshot: {},
      after_snapshot: {
        ...amendment.after_snapshot,
        terms: 'Inspect before fitting.\nKeep the existing finish.',
      },
    } as typeof amendment)
  );
  await open();
  const previous = within(
    screen.getByRole('region', { name: 'Previously accepted pricing' })
  );
  expect(previous.getByText('No item breakdown recorded.')).toBeInTheDocument();
  expect(previous.getAllByText('Not recorded').length).toBeGreaterThan(0);
  expect(previous.queryByText('£0.00')).toBeNull();
  expect(screen.getByText(/Inspect before fitting/)).toHaveTextContent(
    'Keep the existing finish.'
  );
  expect(
    within(screen.getByRole('region', { name: 'Proposed pricing' })).getByText(
      'Part'
    )
  ).toBeInTheDocument();
});
it('requires review and sends actual CSRF-protected approval with the loaded version', async () => {
  await open();
  expect(screen.getByText('Approve proposal')).toBeDisabled();
  expect(
    within(
      screen.getByRole('region', { name: 'Previously accepted pricing' })
    ).getAllByText('£100.00', { selector: 'dd' })
  ).toHaveLength(2);
  expect(
    within(
      screen.getByRole('region', { name: 'Proposed pricing' })
    ).getAllByText('£120.00', { selector: 'dd' })
  ).toHaveLength(2);
  review();
  mocks.read.mockResolvedValue(
    page({ ...amendment, status: 'approved', version: 2 })
  );
  fireEvent.click(screen.getByText('Approve proposal'));
  await screen.findByText('approved', { exact: true });
  const options = mocks.post.mock.calls[0][1];
  expect(options.headers.get('x-csrf-token')).toBe('csrf-test-token');
  expect(options.credentials).toBe('same-origin');
  expect(JSON.parse(options.body)).toEqual({
    action: 'approve',
    expected_version: 1,
    confirmed: true,
    note: '',
  });
  expect(screen.getByText(/current price stays in effect/)).toBeInTheDocument();
  expect(screen.queryByText('Apply approved pricing')).toBeNull();
});
it('shows a read-only review to a homeowner who is not the designated payer', async () => {
  mocks.read.mockResolvedValue(
    response(200, {
      amendments: [amendment],
      can_approve: false,
      is_contractor: false,
      next_before: null,
    })
  );
  await open();
  expect(screen.queryByText('Approve proposal')).toBeNull();
  expect(screen.queryByText('Reject proposal')).toBeNull();
});
it('allows contractor application only for approved proposals and preserves the separate signature step', async () => {
  const approved = { ...amendment, status: 'approved', version: 2 };
  mocks.read.mockResolvedValue(page(approved, true));
  render(<QuoteAmendmentReview jobId='job' />);
  await screen.findByText('Apply approved pricing');
  expect(screen.queryByText('Approve proposal')).toBeNull();
  review();
  mocks.post.mockResolvedValue(
    response(200, {
      amendment: {
        ...approved,
        status: 'applied',
        version: 3,
        applied_quote_id: 'new',
      },
    })
  );
  mocks.read.mockResolvedValue(
    page(
      {
        ...approved,
        status: 'applied',
        version: 3,
        applied_quote_id: 'new',
      } as typeof amendment,
      true,
      {
        current_agreement: {
          id: 'contract',
          quote_id: 'new',
          version: 2,
          total: 120,
          status: 'draft',
        },
      }
    )
  );
  fireEvent.click(screen.getByText('Apply approved pricing'));
  await screen.findByRole('link', { name: 'Review revised contract' });
  expect(screen.getByText('View applied quote')).toHaveAttribute(
    'href',
    '/contractor/quotes/new'
  );
  expect(JSON.parse(mocks.post.mock.calls[0][1].body).action).toBe('apply');
});
it('retains the exact decision across an ambiguous save and prevents duplicate submissions', async () => {
  await open();
  review();
  fireEvent.change(screen.getByLabelText('Decision note (optional)'), {
    target: { value: 'Agreed' },
  });
  mocks.post.mockRejectedValueOnce(new Error('Connection lost'));
  fireEvent.click(screen.getByText('Approve proposal'));
  await screen.findByText('Retry same action');
  const body = mocks.post.mock.calls[0][1].body;
  expect(screen.getByLabelText('Decision note (optional)')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry same action'));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
  expect(mocks.post.mock.calls[1][1].body).toBe(body);
});
it('does not post if CSRF bootstrap fails', async () => {
  await open();
  review();
  mocks.csrf.mockResolvedValue(response(503, {}));
  fireEvent.click(screen.getByText('Approve proposal'));
  await screen.findByText('Failed to fetch CSRF token');
  expect(mocks.post).not.toHaveBeenCalled();
});
it('blocks stale or financially ineligible actions without claiming application', async () => {
  await open();
  review();
  mocks.post.mockResolvedValue(
    response(409, { error: { message: 'Financial records exist' } })
  );
  fireEvent.click(screen.getByText('Approve proposal'));
  await screen.findByText('Financial records exist');
  expect(screen.queryByText('Retry same action')).toBeNull();
  expect(screen.getByText('Approve proposal')).toBeDisabled();
});
it('allows rejection with a recorded decision note', async () => {
  await open();
  review();
  fireEvent.change(screen.getByLabelText('Decision note (optional)'), {
    target: { value: 'Please revise quantity' },
  });
  mocks.post.mockResolvedValue(
    response(200, {
      amendment: { ...amendment, status: 'rejected', version: 2 },
    })
  );
  fireEvent.click(screen.getByText('Reject proposal'));
  await waitFor(() => expect(mocks.post).toHaveBeenCalled());
  expect(JSON.parse(mocks.post.mock.calls[0][1].body)).toMatchObject({
    action: 'reject',
    note: 'Please revise quantity',
  });
});
it('shows unavailable reads as retryable errors, not empty success', async () => {
  mocks.read.mockResolvedValueOnce(response(500, { error: 'Unavailable' }));
  render(<QuoteAmendmentReview jobId='job' />);
  await screen.findByText('Unavailable');
  expect(screen.queryByText(/No proposals/)).toBeNull();
  fireEvent.click(screen.getByText('Refresh review'));
  await screen.findByRole('heading', { name: 'Amendment 1', exact: true });
});
it('loads older proposals while retaining current ones', async () => {
  mocks.read.mockResolvedValueOnce(
    response(200, {
      amendments: [{ ...amendment, sequence: 2 }],
      can_approve: true,
      is_contractor: false,
      next_before: 2,
    })
  );
  render(<QuoteAmendmentReview jobId='job' />);
  await screen.findByRole('heading', { name: 'Amendment 2', exact: true });
  mocks.read.mockResolvedValue(page({ ...amendment, id: 'older' }));
  fireEvent.click(screen.getByText('Load older amendments'));
  await screen.findByRole('heading', { name: 'Amendment 1', exact: true });
  expect(
    screen.getByRole('heading', { name: 'Amendment 2', exact: true })
  ).toBeInTheDocument();
  expect(mocks.read).toHaveBeenLastCalledWith(
    '/api/jobs/job/quote-amendments?before=2'
  );
});
it('publishes only after confirmation and includes CSRF protection', async () => {
  mocks.post.mockResolvedValue(response(200, { amendment }));
  render(<PublishQuoteAmendment jobId='job' revisionId='revision' />);
  fireEvent.click(screen.getByText('Submit for customer review'));
  await screen.findByText(/Available for customer review/);
  expect(mocks.confirm).toHaveBeenCalled();
  expect(mocks.post.mock.calls[0][1].headers.get('x-csrf-token')).toBe(
    'csrf-test-token'
  );
  expect(JSON.parse(mocks.post.mock.calls[0][1].body)).toMatchObject({
    action: 'publish',
    expected_version: 0,
  });
  expect(screen.getByText('Submit for customer review')).toBeDisabled();
});
it('cancelled publication sends nothing', async () => {
  mocks.confirm.mockResolvedValue(false);
  render(<PublishQuoteAmendment jobId='job' revisionId='revision' />);
  await act(async () =>
    fireEvent.click(screen.getByText('Submit for customer review'))
  );
  expect(mocks.post).not.toHaveBeenCalled();
});
