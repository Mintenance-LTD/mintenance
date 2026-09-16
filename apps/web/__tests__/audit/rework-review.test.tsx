import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const mocks = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mocks.request }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/components/ui/BeforeAfterSlider', () => ({
  BeforeAfterSlider: () => null,
}));
import { HomeownerPhotoReview } from '@/app/jobs/[id]/components/HomeownerPhotoReview';

const show = () => {
  render(
    <HomeownerPhotoReview
      jobId='synthetic-job'
      completedAt='2026-09-15T10:00:00Z'
      beforePhotos={[{ id: 'before', photo_url: '/before' }]}
      afterPhotos={[{ id: 'after', photo_url: '/after' }]}
      isConfirmed={false}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Request Changes' }));
  fireEvent.change(screen.getByLabelText('Changes needed'), {
    target: { value: ' Repair the seal ' },
  });
};
const send = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('does not turn an unconfirmed approval response into visible success', async () => {
  mocks.request.mockResolvedValue(response({}));
  render(
    <HomeownerPhotoReview
      jobId='synthetic-job'
      completedAt='2026-09-15T10:00:00Z'
      beforePhotos={[{ id: 'before', photo_url: '/before' }]}
      afterPhotos={[{ id: 'after', photo_url: '/after' }]}
      isConfirmed={false}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Approve Work' }));
  await screen.findByText('Unable to confirm approval. Please retry.');
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(JSON.parse(mocks.request.mock.calls[0][1].body)).toEqual({
    completedAt: '2026-09-15T10:00:00Z',
  });
  expect(screen.queryByText('Work Approved')).toBeNull();
});

it('recovers a lost response using the original key and preserves feedback until confirmed', async () => {
  mocks.request
    .mockRejectedValueOnce(new Error('Connection interrupted'))
    .mockResolvedValueOnce(response({ success: true }));
  show();
  send();
  await screen.findByText('Connection interrupted');
  expect(screen.getByLabelText('Changes needed')).toHaveValue(
    ' Repair the seal '
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
  send();
  await screen.findByText('Change request sent to the contractor.');
  const first = mocks.request.mock.calls[0][1];
  const second = mocks.request.mock.calls[1][1];
  expect(first.headers['Idempotency-Key']).toEqual(expect.any(String));
  expect(second.headers['Idempotency-Key']).toBe(
    first.headers['Idempotency-Key']
  );
  expect(JSON.parse(second.body)).toEqual({
    comments: 'Repair the seal',
    completedAt: '2026-09-15T10:00:00Z',
  });
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});

it('does not report success for an unconfirmed HTTP 200 and shows structured errors', async () => {
  mocks.request
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(
      response({ error: { message: 'The payment state changed' } }, false)
    );
  show();
  send();
  await screen.findByText(
    'Unable to confirm the change request. Please retry.'
  );
  send();
  await screen.findByText('The payment state changed');
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Changes needed')).toHaveValue(
    ' Repair the seal '
  );
});

it('separates edited feedback but reuses the key when the original feedback is retried', async () => {
  mocks.request.mockRejectedValue(new Error('Offline'));
  show();
  send();
  await screen.findByText('Offline');
  fireEvent.change(screen.getByLabelText('Changes needed'), {
    target: { value: 'Repair the door' },
  });
  send();
  await screen.findByText('Offline');
  fireEvent.change(screen.getByLabelText('Changes needed'), {
    target: { value: 'Repair the seal' },
  });
  send();
  await screen.findByText('Offline');
  const keys = mocks.request.mock.calls.map(
    ([, options]) => options.headers['Idempotency-Key']
  );
  expect(keys[1]).not.toBe(keys[0]);
  expect(keys[2]).toBe(keys[0]);
});

it('allows only one pending submission and disables feedback edits while sending', async () => {
  let finish!: (value: unknown) => void;
  mocks.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  show();
  send();
  fireEvent.click(screen.getByRole('button', { name: 'Sending...' }));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Changes needed')).toBeDisabled();
  finish(response({ success: true }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
});
