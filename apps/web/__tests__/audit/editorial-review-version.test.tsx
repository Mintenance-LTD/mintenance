import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mocks.request }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-hot-toast', () => ({ default: { error: mocks.error } }));
import { MintEditorialJobReview } from '@/app/jobs/[id]/review/MintEditorialJobReview';
const job = {
  id: 'job',
  title: 'Synthetic repair',
  status: 'completed',
  completed_at: '2026-09-16T10:00:00.123456Z',
  budget: 500,
  contractor_id: 'contractor',
  completion_confirmed_by_homeowner: true,
};
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('does not substitute a new server completion when the displayed version is missing', async () => {
  render(<MintEditorialJobReview job={{ ...job, completed_at: null }} />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'The completed repair looked very good.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /post review/i }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(
      'Reload the job to review its current completion.'
    )
  );
  expect(mocks.request).not.toHaveBeenCalled();
});
it('does not post a review on an unconfirmed 2xx approval response', async () => {
  mocks.request.mockResolvedValue(
    new Response(JSON.stringify({ success: false }))
  );
  render(<MintEditorialJobReview job={job} />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'The completed repair looked very good.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /post review/i }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(
      'Completion approval is not confirmed. Refresh and try again.'
    )
  );
  expect(mocks.request).toHaveBeenCalledTimes(1);
});
it.each([false, true])(
  'revalidates the displayed completion before posting a review (prior approval %s)',
  async (approved) => {
    mocks.request.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Completion changed' }), {
        status: 409,
      })
    );
    render(
      <MintEditorialJobReview
        job={{ ...job, completion_confirmed_by_homeowner: approved }}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'The completed repair looked very good.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post review/i }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('Completion changed')
    );
    expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.request.mock.calls[0][0]).toBe(
      '/api/jobs/job/confirm-completion'
    );
    expect(JSON.parse(mocks.request.mock.calls[0][1].body)).toEqual({
      completedAt: job.completed_at,
    });
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'The completed repair looked very good.'
    );
  }
);

it('reports approval and review publication without claiming a transfer or an uncharged tip', async () => {
  mocks.request.mockImplementation(
    async () =>
      new Response(JSON.stringify({ success: true, reviewId: 'review' }))
  );
  render(<MintEditorialJobReview job={job} />);
  expect(screen.queryByText('Add a tip')).toBeNull();
  expect(screen.queryByText(/500.*in escrow/)).toBeNull();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'The completed repair looked very good.' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Approve work & post review' })
  );
  await screen.findByRole('heading', {
    name: 'Work approved and review posted.',
  });
  expect(
    screen.getByText(
      /Payment release remains subject to the cooling-off period and final checks/
    )
  ).toBeDefined();
  expect(screen.queryByText(/on its way|Released to/)).toBeNull();
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(JSON.parse(mocks.request.mock.calls[1][1].body).comment).not.toContain(
    '[Tip:'
  );
});

it('recovers after approval succeeds and the review response is lost', async () => {
  let attempts = 0;
  mocks.request.mockImplementation(async (url: string) => {
    if (url.endsWith('/review') && ++attempts === 1)
      throw new Error('Response lost');
    return new Response(
      JSON.stringify({ success: true, reviewId: 'persisted-review' })
    );
  });
  render(<MintEditorialJobReview job={job} />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'The completed repair looked very good.' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Approve work & post review' })
  );
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Response lost')
  );
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
    'The completed repair looked very good.'
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Approve work & post review' })
  );
  await screen.findByRole('heading', {
    name: 'Work approved and review posted.',
  });
  const requests = mocks.request.mock.calls.filter(([url]) =>
    url.endsWith('/review')
  );
  expect(requests).toHaveLength(2);
  expect(requests[1][1].body).toBe(requests[0][1].body);
});
