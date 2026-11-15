import { beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MintEditorialTransactionList } from '@/app/payments/components/MintEditorialTransactionList';
const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('labels a disputed payment and opens its exact dispute without offering release or refund', () => {
  const onViewReceipt = vi.fn();
  render(
    <MintEditorialTransactionList
      transactions={[
        {
          id: 'escrow-reference',
          amount: 100,
          status: 'disputed',
          type: 'escrow',
          created_at: '2026-09-24',
          updated_at: '2026-09-24',
        },
      ]}
      loading={false}
      filter='all'
      userRole='homeowner'
      onReleasePayment={vi.fn()}
      onRequestRefund={vi.fn()}
      onViewReceipt={onViewReceipt}
    />
  );
  expect(screen.getByText('Disputed')).toBeDefined();
  expect(
    screen.queryByRole('button', { name: /Release|Refund|Receipt/ })
  ).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'View dispute' }));
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith(
    '/disputes/escrow-reference'
  );
  expect(onViewReceipt).not.toHaveBeenCalled();
});

it.each(['assigned', 'in_progress', undefined, 'completed'])(
  'only offers release for a completed job (%s)',
  (jobStatus) => {
    render(
      <MintEditorialTransactionList
        transactions={[
          {
            id: 'escrow',
            amount: 100,
            status: 'held',
            type: 'escrow',
            created_at: '2026-11-14',
            updated_at: '2026-11-14',
            job_status: jobStatus,
          },
        ]}
        loading={false}
        filter='all'
        userRole='homeowner'
        onReleasePayment={vi.fn()}
        onRequestRefund={vi.fn()}
        onViewReceipt={vi.fn()}
      />
    );
    expect(
      screen.queryAllByRole('button', { name: /Approve.*Release/ }).length > 0
    ).toBe(jobStatus === 'completed');
  }
);
