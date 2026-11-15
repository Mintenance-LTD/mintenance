import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BidSubmissionClient2025 } from '@/app/contractor/(dashboard)/bid/[jobId]/components/BidSubmissionClient2025';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn() }),
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'contractor', role: 'contractor' } }),
}));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'fresh' }),
}));
vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock(
  '@/app/contractor/(dashboard)/bid/[jobId]/components/BidJobDetailsPanel',
  () => ({ BidJobDetailsPanel: () => null })
);
vi.mock(
  '@/app/contractor/(dashboard)/bid/[jobId]/components/PricingSuggestionCard',
  () => ({ PricingSuggestionCard: () => null })
);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes('/rooms') ? { rooms: [] } : { success: true },
  }));
});
afterEach(() => vi.unstubAllGlobals());
const proposal =
  'I will complete the agreed gardening work with care and leave the garden tidy.';
it.each([20, 0])(
  'preserves %s percent VAT and submits exactly the displayed total',
  async (rate) => {
    render(
      <BidSubmissionClient2025
        job={{ id: 'job', title: 'Garden maintenance' }}
        platformFeeRate={0.05}
        existingBid={{
          amount: 2,
          description: proposal,
          taxRate: rate,
          estimatedDuration: 1,
          proposedStartDate: '2027-01-10',
        }}
      />
    );
    expect(screen.getByLabelText('VAT rate (%)')).toHaveValue(rate);
    expect(
      screen.getByText('VAT: £' + (rate === 20 ? '0.40' : '0.00'))
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Update Bid' }));
    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/contractor/submit-bid',
        expect.anything()
      )
    );
    const call = mocks.fetch.mock.calls.find(
      ([url]) => url === '/api/contractor/submit-bid'
    );
    expect(JSON.parse(call![1].body)).toMatchObject({
      subtotal: 2,
      taxRate: rate,
      taxAmount: rate === 20 ? 0.4 : 0,
      totalAmount: rate === 20 ? 2.4 : 2,
      bidAmount: rate === 20 ? 2.4 : 2,
    });
  }
);
