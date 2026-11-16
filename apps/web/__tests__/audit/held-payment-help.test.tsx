import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EscrowStatusDashboardClient } from '@/app/contractor/(dashboard)/escrow/status/components/EscrowStatusDashboardClient';
const m = vi.hoisted(() => ({
  request: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: m.request }));
vi.mock('react-hot-toast', () => ({
  default: { success: m.success, error: m.error },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('shows UK milestones and uses the CSRF-aware client to request help with held payment', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        data:
          url === '/api/contractor/escrows'
            ? [
                {
                  id: 'escrow',
                  jobId: 'job',
                  jobTitle: 'Synthetic held job',
                  amount: 2,
                  status: 'held',
                  createdAt: '2020-01-01',
                },
              ]
            : {
                status: 'held',
                blockingReasons: ['Homeowner review pending'],
                nextAction: 'Request admin review',
                estimatedReleaseDate: '2026-11-18T15:02:00Z',
                canRelease: false,
                adminHoldStatus: 'none',
                homeownerApproval: false,
                photoVerificationStatus: 'verified',
                coolingOffEndsAt: '2026-11-18T15:02:00Z',
                autoApprovalDate: '2020-01-01T15:02:00Z',
              },
      }),
    }))
  );
  m.request.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
  render(<EscrowStatusDashboardClient />);
  fireEvent.click(await screen.findByText('Synthetic held job'));
  await screen.findByText(/Earliest estimated release eligibility/);
  expect(screen.getAllByText(/18 November 2026 at 15:02 GMT/)).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Request Admin Review' }));
  await waitFor(() => expect(m.success).toHaveBeenCalled());
  expect(m.request).toHaveBeenCalledWith(
    '/api/escrow/escrow/request-admin-review',
    { method: 'POST' }
  );
});
