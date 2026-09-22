import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResolveDisputeDialog } from '@/app/admin/disputes/components/ResolveDisputeDialog';
import type { Dispute } from '@/app/admin/disputes/components/DisputesTable';
afterEach(cleanup);
it('reopens the saved choice read-only and offers settlement recovery', () => {
  const recover = vi.fn();
  const change = vi.fn();
  const dispute = {
    id: 'escrow',
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
  render(
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
  );
  for (const radio of screen.getAllByRole('radio'))
    expect((radio as HTMLInputElement).disabled).toBe(true);
  expect(
    (screen.getByDisplayValue('split_50_50') as HTMLInputElement).checked
  ).toBe(true);
  expect(
    (screen.getByDisplayValue('Agreed split') as HTMLInputElement).disabled
  ).toBe(true);
  expect(screen.getByRole('status').textContent).toContain(
    'does not create a new payment'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Check settlement' }));
  expect(recover).toHaveBeenCalledOnce();
  expect(change).not.toHaveBeenCalled();
});
