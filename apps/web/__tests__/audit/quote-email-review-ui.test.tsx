import React from 'react';
import { randomUUID } from 'node:crypto';
vi.unmock('@tanstack/react-query');
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuoteAmendmentEmailReview } from '@/app/admin/components/QuoteAmendmentEmailReview';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  read: vi.fn(),
  post: vi.fn(),
  csrf: vi.fn(),
  history: vi.fn(),
}));
const id = '00000000-0000-4000-8000-000000000001';
const row = {
  amendment_id: id,
  version: 1,
  job_id: id,
  action: 'publish',
  status: 'needs_review',
  attempts: 2,
  error_code: 'send_outcome_unknown',
  created_at: '2026-11-07T12:00:00Z',
  review_version: 0,
  review_sequence: 7,
};
const response = (status: number, data: unknown) => ({
  status,
  ok: status < 400,
  json: async () => data,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID });
  mocks.read.mockResolvedValue(
    response(200, { rows: [row], next_before: null })
  );
  mocks.csrf.mockResolvedValue(response(200, { token: 'csrf-review-test' }));
  mocks.history.mockResolvedValue(response(200, { reviews: [] }));
  mocks.post.mockImplementation(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);
    return response(200, {
      review: {
        ...body,
        review_version: 1,
        result_status:
          body.action === 'retry'
            ? 'pending'
            : body.action === 'confirm_accepted'
              ? 'reviewed_accepted'
              : 'reviewed_unknown',
        previous_status: 'needs_review',
        previous_attempts: 2,
        previous_error_code: 'send_outcome_unknown',
        created_at: '2026-11-07T13:00:00Z',
      },
    });
  });
  mocks.fetch.mockImplementation((url: string, options?: RequestInit) =>
    url === '/api/csrf'
      ? mocks.csrf()
      : options?.method === 'POST'
        ? mocks.post(url, options)
        : url.includes('amendment_id=')
          ? mocks.history(url)
          : mocks.read(url)
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <QuoteAmendmentEmailReview />
    </QueryClientProvider>
  );
  fireEvent.click(screen.getByText('Review quote amendment emails'));
  fireEvent.click(await screen.findByText('Inspect email event 1'));
  await screen.findByText('No previous reviews.');
  return client;
}
function fill(action = 'close_unknown', evidence = 'unknown') {
  fireEvent.change(screen.getByLabelText('Review action'), {
    target: { value: action },
  });
  fireEvent.change(screen.getByLabelText('Provider evidence'), {
    target: { value: evidence },
  });
  fireEvent.change(
    screen.getByLabelText('Evidence reference and review note'),
    {
      target: {
        value: 'Provider reference REF-123 was inspected by the operator.',
      },
    }
  );
  fireEvent.click(screen.getByRole('checkbox'));
}
it('requires explicit confirmation and preserves the unknown outcome', async () => {
  await setup();
  expect(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  ).toBeDisabled();
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  );
  await screen.findByText(
    'Review recorded with delivery unknown. No email will be resent.'
  );
  expect(JSON.parse(mocks.post.mock.calls[0][1].body)).toMatchObject({
    action: 'close_unknown',
    evidence: 'unknown',
    expected_review_version: 0,
    confirmed: true,
  });
  expect(
    new Headers(mocks.post.mock.calls[0][1].headers).get('x-csrf-token')
  ).toBe('csrf-review-test');
});
it('rejects retry without evidence of non-acceptance', async () => {
  await setup();
  fill('retry', 'unknown');
  fireEvent.click(
    screen.getByRole('button', { name: 'Queue another attempt' })
  );
  await screen.findByText(/Confirm the action, matching evidence/);
  expect(mocks.post).not.toHaveBeenCalled();
});
it('queues a retry without claiming it sent an email', async () => {
  await setup();
  fill('retry', 'not_accepted');
  fireEvent.click(
    screen.getByRole('button', { name: 'Queue another attempt' })
  );
  await screen.findByText(/Retry queued. The worker/);
});
it('records acceptance separately from inbox delivery', async () => {
  await setup();
  fill('confirm_accepted', 'accepted');
  fireEvent.click(
    screen.getByRole('button', { name: 'Record provider acceptance' })
  );
  await screen.findByText(
    'Provider acceptance recorded from your evidence. Inbox delivery is not established.'
  );
});
it('retains the exact request after an ambiguous response and freezes inputs', async () => {
  mocks.post.mockResolvedValueOnce(response(500, {}));
  await setup();
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  );
  await screen.findByText(/Save outcome is uncertain/);
  expect(
    screen.getByLabelText('Evidence reference and review note')
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry same review' }));
  await screen.findByText(
    'Review recorded with delivery unknown. No email will be resent.'
  );
  expect(mocks.post.mock.calls[1][1].body).toBe(
    mocks.post.mock.calls[0][1].body
  );
});
it('blocks conflicting reviews until refreshed', async () => {
  mocks.post.mockResolvedValueOnce(response(409, {}));
  await setup();
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  );
  await screen.findByText(/Review unavailable or changed/);
  expect(
    screen.getByRole('button', { name: 'Retry same review' })
  ).toBeDisabled();
  fireEvent.click(screen.getByText('Refresh email reviews'));
  await waitFor(() =>
    expect(screen.queryByLabelText('Selected email review')).toBeNull()
  );
});
it('does not claim success for an unconfirmed response', async () => {
  mocks.post.mockResolvedValueOnce(
    response(200, { review: { request_id: 'invalid' } })
  );
  await setup();
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  );
  await screen.findByText(
    'Saved review could not be confirmed. Retry the same review.'
  );
  expect(
    screen.getByLabelText('Evidence reference and review note')
  ).toBeDisabled();
});
it('does not post when CSRF bootstrap fails', async () => {
  // Expire the real helper's token cache so this exercises bootstrap failure.
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60_000);
  mocks.csrf.mockResolvedValue(response(500, {}));
  await setup();
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  );
  await screen.findByRole('alert');
  expect(mocks.post).not.toHaveBeenCalled();
});
it('guards double submission while the provider-independent review is pending', async () => {
  let resolve!: (value: unknown) => void;
  mocks.post.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  await setup();
  fill();
  const button = screen.getByRole('button', {
    name: 'Close with delivery unknown',
  });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
  await act(async () => resolve(response(409, {})));
});
it('fails closed on list and history errors', async () => {
  mocks.read.mockResolvedValueOnce(response(500, {}));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <QuoteAmendmentEmailReview />
    </QueryClientProvider>
  );
  fireEvent.click(screen.getByText('Review quote amendment emails'));
  await screen.findByText(/Email recovery could not be verified/);
  expect(screen.queryByText('No emails in this queue.')).toBeNull();
  fireEvent.click(screen.getByText('Refresh email reviews'));
  mocks.history.mockResolvedValue(response(500, {}));
  fireEvent.click(await screen.findByText('Inspect email event 1'));
  await screen.findByText(/Review history unavailable/);
  fill();
  expect(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  ).toBeDisabled();
});
it('keeps confirmed success when list refresh fails', async () => {
  await setup();
  mocks.read.mockResolvedValue(response(500, {}));
  fill();
  fireEvent.click(
    screen.getByRole('button', { name: 'Close with delivery unknown' })
  );
  await screen.findByText(
    'Review recorded with delivery unknown. No email will be resent.'
  );
  await screen.findByText(/Email recovery could not be verified/);
});
it('paginates the queue and offers closed reviews without recovery controls', async () => {
  mocks.read.mockResolvedValueOnce(
    response(200, { rows: [row], next_before: 7 })
  );
  await setup();
  fireEvent.click(screen.getByText('Older emails'));
  await waitFor(() =>
    expect(mocks.read).toHaveBeenCalledWith(expect.stringContaining('before=7'))
  );
  mocks.read.mockResolvedValue(
    response(200, {
      rows: [{ ...row, status: 'reviewed_unknown' }],
      next_before: null,
    })
  );
  fireEvent.change(screen.getByLabelText('Email review queue'), {
    target: { value: 'reviewed' },
  });
  await screen.findByText(/reviewed unknown/);
  fireEvent.click(screen.getByText('Inspect email event 1'));
  expect(screen.queryByLabelText('Review action')).toBeNull();
});
