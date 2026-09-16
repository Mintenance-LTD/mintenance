import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionModal } from '@/app/admin/refunds/components/ActionModal';
import type { EscrowRecord } from '@/app/admin/refunds/components/RefundManagementClient';

const escrow: EscrowRecord = {
  id: 'escrow',
  job_id: 'job',
  amount: 100,
  status: 'release_pending',
  payment_intent_id: 'pi_synthetic',
  transfer_id: null,
  platform_fee: null,
  contractor_payout: null,
  release_reason: 'refund_pending',
  created_at: '',
  updated_at: '',
  released_at: null,
  jobs: {
    id: 'job',
    title: 'Synthetic repair',
    status: 'disputed',
    homeowner_id: 'payer',
    contractor_id: 'contractor',
    homeowner: null,
    contractor: null,
  },
};
afterEach(cleanup);
describe('admin refund form recovery', () => {
  const props = {
    open: true,
    type: 'refund' as const,
    escrow,
    loading: false,
    onClose: vi.fn(),
    formatCurrency: (amount: number) => `GBP ${amount}`,
  };
  it('restores the original partial amount and reason and submits that same payload', () => {
    const confirm = vi.fn();
    render(
      <ActionModal
        {...props}
        onConfirm={confirm}
        savedRefund={{ reason: 'Original approved reason', amount: 25 }}
      />
    );
    expect(screen.getByLabelText('Partial refund amount')).toHaveValue(25);
    expect(screen.getByLabelText(/Reason/)).toHaveValue(
      'Original approved reason'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Process Refund' }));
    expect(confirm).toHaveBeenCalledWith('Original approved reason', 25);
  });
  it('keeps entered values while processing and prevents another submission', () => {
    const confirm = vi.fn();
    const saved = { reason: 'Original approved reason', amount: 25 };
    const view = render(
      <ActionModal {...props} onConfirm={confirm} savedRefund={saved} />
    );
    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: 'Reason preserved after failure' },
    });
    view.rerender(
      <ActionModal {...props} loading onConfirm={confirm} savedRefund={saved} />
    );
    expect(screen.getByLabelText(/Reason/)).toHaveValue(
      'Reason preserved after failure'
    );
    expect(
      screen.getByRole('button', { name: 'Processing...' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Processing...' }));
    expect(confirm).not.toHaveBeenCalled();
  });
  it('labels a full refund as remaining balance and leaves the amount for the server', () => {
    const confirm = vi.fn();
    render(
      <ActionModal
        {...props}
        onConfirm={confirm}
        savedRefund={{ reason: 'Return remaining balance' }}
      />
    );
    expect(screen.getByLabelText('Full remaining balance')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Process Refund' }));
    expect(confirm).toHaveBeenCalledWith('Return remaining balance', undefined);
  });
});
