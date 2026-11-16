import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ContractActions } from '@/app/jobs/[id]/components/contract/ContractActions';
import type { Contract } from '@/app/jobs/[id]/components/contract/useContractData';
vi.mock('@/components/legal/ContractCancellation', () => ({
  ContractCancellation: () => null,
}));
const contract = {
  id: 'contract',
  status: 'pending_homeowner',
  start_date: '2026-11-16',
  updated_at: '2026-11-15T10:00:00Z',
  review_token: 'version-1',
} as Contract;
const props = {
  contract,
  userRole: 'homeowner' as const,
  isDraft: false,
  canSign: true,
  canDelete: false,
  isSigning: false,
  isRejecting: false,
  isDeleting: false,
  showRejectForm: false,
  rejectReason: '',
  error: null,
  onSign: vi.fn(),
  onReject: vi.fn(),
  onDelete: vi.fn(),
  onDownloadPdf: vi.fn(),
  onShowRejectForm: vi.fn(),
  onRejectReasonChange: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('requires the scheduling decision before signing, without opting into early start', () => {
  render(<ContractActions {...props} />);
  expect(screen.getByText(/Scheduled start:/)).toHaveTextContent(
    '16 November 2026'
  );
  expect(screen.getByText(/If everyone signs today/)).toHaveTextContent(
    '29 November 2026'
  );
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I have read and accept/ })
  );
  const sign = screen.getByRole('button', { name: 'Sign Contract' });
  expect(sign).toBeDisabled();
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /I understand that signing does not authorise/,
    })
  );
  expect(sign).toBeEnabled();
  fireEvent.click(sign);
  expect(props.onSign).toHaveBeenCalledWith(
    expect.objectContaining({
      earlyStartRequested: false,
      fullPerformanceAcknowledged: false,
    })
  );
});
it('lets the homeowner make an explicit early-start choice instead of acknowledging a later schedule', () => {
  render(<ContractActions {...props} />);
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I have read and accept/ })
  );
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I expressly request/ })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sign Contract' }));
  expect(props.onSign).toHaveBeenCalledWith(
    expect.objectContaining({
      earlyStartRequested: true,
      fullPerformanceAcknowledged: false,
    })
  );
});
it('resets the schedule acknowledgement when the contract revision changes', () => {
  const { rerender } = render(<ContractActions {...props} />);
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /I understand that signing does not authorise/,
    })
  );
  rerender(
    <ContractActions
      {...props}
      contract={{ ...contract, review_token: 'version-2' }}
    />
  );
  expect(
    screen.getByRole('checkbox', {
      name: /I understand that signing does not authorise/,
    })
  ).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Sign Contract' })).toBeDisabled();
});
