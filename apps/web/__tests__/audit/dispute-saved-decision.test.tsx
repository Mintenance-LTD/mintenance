vi.unmock('@tanstack/react-query');
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResolveDisputeDialog } from '@/app/admin/disputes/components/ResolveDisputeDialog';
import type { Dispute } from '@/app/admin/disputes/components/DisputesTable';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('reopens the saved choice read-only and offers settlement recovery', async () => {
  const recover = vi.fn();
  const change = vi.fn();
  const dispute = {
    id: 'escrow',
    homeownerId: 'payer',
    contractorId: 'payee',
    jobTitle: 'Synthetic repair',
    amount: 500,
    homeownerName: 'Synthetic payer',
    contractorName: 'Synthetic contractor',
    resolution: {
      id: 'resolution',
      decision: 'split_50_50',
      reason: 'Agreed split',
      state: 'processing',
      refund_minor: 25000,
      release_minor: 25000,
    },
  } as Dispute;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        escrowId: 'escrow',
        decision: 'split_50_50',
        principalMinor: 50000,
        refundMinor: 25000,
        releaseMinor: 25000,
        feeMinor: 1250,
        payoutMinor: 23750,
        payerName: 'Synthetic payer',
        payeeName: 'Synthetic contractor',
        confirmation: {
          principalMinor: 50000,
          feeRate: 0.05,
          payerId: 'payer',
          payeeId: 'payee',
        },
      }),
    })
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ResolveDisputeDialog
        open
        selectedDispute={dispute}
        resolution='split_50_50'
        resolveNotes='Agreed split'
        actionLoading={false}
        onOpenChange={vi.fn()}
        onResolutionChange={change}
        onNotesChange={change}
        onResolve={recover}
      />
    </QueryClientProvider>
  );
  for (const radio of screen.getAllByRole('radio'))
    expect((radio as HTMLInputElement).disabled).toBe(true);
  expect(
    (screen.getByDisplayValue('split_50_50') as HTMLInputElement).checked
  ).toBe(true);
  expect(
    (screen.getByDisplayValue('Agreed split') as HTMLInputElement).disabled
  ).toBe(true);
  expect(screen.getAllByRole('status')[0].textContent).toContain(
    'does not create a new payment'
  );
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /I have reviewed the case/ })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Check settlement' }));
  expect(recover).toHaveBeenCalledOnce();
  expect(change).not.toHaveBeenCalled();
});
