import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminVerificationProvider } from '@/components/admin/AdminVerificationProvider';
import { EvidenceReviewQueue } from '@/app/admin/evidence-retention/EvidenceReviewQueue';

vi.unmock('@tanstack/react-query');
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'fixture-token' }),
}));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({
  MfaStepUpDialog: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Verify synthetic MFA</button>
  ),
}));

const row = {
  kind: 'dispute',
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Boiler repair',
  revision: 0,
  legal_hold: false,
  reason: '',
  review_due_at: '2026-10-22T12:00:00Z',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let fetcher: ReturnType<typeof vi.fn>;
let save: ReturnType<typeof vi.fn>;
let loadPage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  save = vi.fn().mockResolvedValue(json({ success: true, revision: 1 }));
  loadPage = vi.fn(() => json({ records: [row], next: null }));
  fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return save(url, options);
    if (url.includes('kind=dispute')) return json({ review: row });
    return loadPage(url);
  });
  vi.stubGlobal('fetch', fetcher);
});

afterEach(() => vi.unstubAllGlobals());

function openQueue() {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={query}>
      <AdminVerificationProvider>
        <EvidenceReviewQueue />
      </AdminVerificationProvider>
    </QueryClientProvider>
  );
}

async function fill() {
  openQueue();
  const open = await screen.findByRole('button', {
    name: 'Open review for Boiler repair',
  });
  expect(
    screen.queryByRole('button', { name: 'Save review' })
  ).not.toBeInTheDocument();
  fireEvent.click(open);
  const reason = await screen.findByLabelText('Reason for retention or hold');
  fireEvent.change(reason, {
    target: { value: 'Synthetic case reference 123' },
  });
  fireEvent.change(screen.getByLabelText('Next review date'), {
    target: { value: '2026-12-22' },
  });
  fireEvent.click(screen.getByLabelText('Preserve under a hold'));
  return reason;
}

it('keeps the exact review decision across MFA and waits for confirmation', async () => {
  save.mockResolvedValueOnce(json({ requiresStepUp: true }, 403));
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
  fireEvent.click(await screen.findByText('Verify synthetic MFA'));
  await screen.findByText('Review saved. Evidence remains retained.');
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[0][1].body).toBe(save.mock.calls[1][1].body);
});

it('preserves entered reasons after failure and does not show success', async () => {
  save.mockRejectedValue(new Error('Connection interrupted'));
  const reason = await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Connection interrupted'
  );
  expect(reason).toHaveValue('Synthetic case reference 123');
  expect(
    screen.queryByText('Review saved. Evidence remains retained.')
  ).toBeNull();
});

it('keeps the selected review draft while retrying the same next page', async () => {
  loadPage.mockImplementationOnce(() =>
    json({ records: [row], next: 'cursor' })
  );
  loadPage.mockRejectedValueOnce(new Error('Disconnected'));
  loadPage.mockImplementationOnce(() =>
    json({
      records: [{ ...row, id: 'second', title: 'Kitchen review' }],
      next: null,
    })
  );
  const reason = await fill();
  fireEvent.click(screen.getByText('Load more reviews'));
  await screen.findByRole('alert');
  expect(reason).toHaveValue('Synthetic case reference 123');
  fireEvent.click(screen.getByText('Load more reviews'));
  await screen.findByRole('button', { name: 'Open review for Kitchen review' });
  expect(screen.getAllByLabelText('Reason for retention or hold')).toHaveLength(
    1
  );
  expect(reason).toHaveValue('Synthetic case reference 123');
  expect(loadPage.mock.calls[1][0]).toBe(loadPage.mock.calls[2][0]);
});

it('returns through admin sign-in with the selected filter when the session expires', async () => {
  loadPage.mockImplementationOnce(() => json({ records: [row], next: null }));
  loadPage.mockImplementationOnce(() => json({}, 401));
  openQueue();
  await screen.findByRole('button', { name: 'Open review for Boiler repair' });
  fireEvent.click(screen.getByRole('button', { name: 'Held' }));
  const link = await screen.findByRole('link', {
    name: 'Sign in and return to Evidence reviews',
  });
  expect(link).toHaveAttribute(
    'href',
    '/admin/login?redirect=%2Fadmin%2Fevidence-retention%3Ffilter%3Dheld'
  );
  await waitFor(() =>
    expect(screen.queryByText('No reviews match this filter.')).toBeNull()
  );
});
