import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.unmock('@tanstack/react-query');
import { DisputesClient } from '@/app/admin/disputes/components/DisputesClient';
import type { Dispute } from '@/app/admin/disputes/components/DisputesTable';

const dispute: Dispute = {
  id: 'fc160906-0000-4000-8000-000000000020',
  jobId: 'synthetic-job',
  jobTitle: 'Synthetic repair',
  jobStatus: 'completed',
  jobCategory: 'plumbing',
  homeownerId: 'owner',
  homeownerName: 'Synthetic Owner',
  homeownerEmail: 'owner@example.invalid',
  contractorId: 'contractor',
  contractorName: 'Synthetic Contractor',
  contractorEmail: 'contractor@example.invalid',
  amount: 500,
  escrowStatus: 'disputed',
  adminHoldStatus: 'pending_review',
  holdReason: 'Incomplete repair',
  homeownerApproval: false,
  photoVerificationStatus: null,
  coolingOffEndsAt: null,
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
let client: QueryClient;
let requests: { url: string; body: unknown; csrf: string | null }[];
let verification: () => Response;
let settlement: () => Response;
beforeEach(() => {
  requests = [];
  verification = () => json({ success: true });
  settlement = () =>
    json({
      success: true,
      status: 'completed',
      resolutionId: 'saved-resolution',
    });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/csrf') return json({ token: 'synthetic-csrf' });
      if (url.startsWith('/api/admin/disputes?'))
        return json({
          data: [dispute],
          stats: { open: 1, reviewing: 0, resolved: 0, totalAmountAtRisk: 500 },
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      requests.push({
        url,
        body: JSON.parse(String(init?.body)),
        csrf: new Headers(init?.headers).get('X-CSRF-Token'),
      });
      if (url === '/api/auth/mfa/step-up') return verification();
      if (requests.filter((r) => r.url === url).length === 1)
        return json({ requiresStepUp: true, maxAgeMinutes: 15 }, 403);
      return url === '/api/admin/escrow/hold'
        ? json({ success: true, escrowId: dispute.id })
        : settlement();
    })
  );
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <DisputesClient />
    </QueryClientProvider>
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});

async function startResolution() {
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Resolve dispute for Synthetic repair',
    })
  );
  fireEvent.click(screen.getByRole('radio', { name: /Split 50\/50/ }));
  fireEvent.change(
    screen.getByPlaceholderText('Add resolution notes (optional)...'),
    { target: { value: 'Agreed synthetic split' } }
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Resolution' }));
  await screen.findByRole('dialog', { name: 'Confirm your identity' });
}
function verify() {
  fireEvent.change(screen.getByLabelText('Verification code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }));
}

it('verifies with CSRF, then retries the exact decision and closes only on confirmed completion', async () => {
  await startResolution();
  expect(requests).toHaveLength(1);
  verify();
  await waitFor(() => expect(requests).toHaveLength(3));
  await waitFor(() =>
    expect(
      screen.queryByRole('alertdialog', { name: 'Resolve Dispute' })
    ).toBeNull()
  );
  expect(requests.map((r) => r.url)).toEqual([
    '/api/admin/disputes/resolve',
    '/api/auth/mfa/step-up',
    '/api/admin/disputes/resolve',
  ]);
  expect(requests[2].body).toEqual(requests[0].body);
  expect(requests[2].body).toEqual({
    escrowId: dispute.id,
    decision: 'split_50_50',
    reason: 'Agreed synthetic split',
  });
  expect(requests.every((r) => r.csrf === 'synthetic-csrf')).toBe(true);
});
it('cancels verification without retrying or losing the selected decision', async () => {
  await startResolution();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel verification' }));
  await screen.findByRole('alertdialog', { name: 'Resolve Dispute' });
  expect(screen.getByRole('radio', { name: /Split 50\/50/ })).toBeChecked();
  expect(
    screen.getByPlaceholderText('Add resolution notes (optional)...')
  ).toHaveValue('Agreed synthetic split');
  expect(requests).toHaveLength(1);
});
it('does not replay after failed MFA and does not report pending settlement as success', async () => {
  verification = () =>
    json({ error: { message: 'Invalid verification code' } }, 401);
  await startResolution();
  verify();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Invalid verification code'
  );
  expect(
    requests.filter((r) => r.url === '/api/admin/disputes/resolve')
  ).toHaveLength(1);
  verification = () => json({ success: true });
  settlement = () =>
    json(
      {
        success: false,
        status: 'processing',
        message: 'Settlement remains pending',
      },
      202
    );
  verify();
  await screen.findByText('Settlement remains pending');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(
    await screen.findByRole('alertdialog', { name: 'Resolve Dispute' })
  ).toBeInTheDocument();
  const payments = requests.filter(
    (r) => r.url === '/api/admin/disputes/resolve'
  );
  expect(payments).toHaveLength(2);
  expect(payments[0].body).toEqual(payments[1].body);
});
it('also completes the hold-for-review action through MFA using the original escrow', async () => {
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Hold dispute for Synthetic repair for review',
    })
  );
  await screen.findByRole('dialog', { name: 'Confirm your identity' });
  verify();
  await waitFor(() => expect(requests).toHaveLength(3));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Confirm your identity' })
    ).toBeNull()
  );
  expect(requests[0].url).toBe('/api/admin/escrow/hold');
  expect(requests[2].body).toEqual(requests[0].body);
});
