'use client';
import { explainCoolingOff } from './explain-cooling-off';

import React, { useState, useEffect, useRef } from 'react';
import { readPendingRefund, submitRefund } from '@/lib/payments/refund-request';
import {
  paymentAmounts,
  summarizePayments,
} from '@/lib/payments/payment-amounts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ChevronLeft } from 'lucide-react';
import { PaymentsHeader } from './components/PaymentsHeader';
import { PaymentsStatsCards } from './components/PaymentsStatsCards';
import { PaymentsFilters } from './components/PaymentsFilters';
import { TransactionList } from './components/TransactionList';
import { PaymentsRefundModal } from './components/PaymentsRefundModal';
import { PaymentsReceiptModal } from './components/PaymentsReceiptModal';
import { loadPaymentHistory } from './load-payment-history';
import {
  paymentHistoryCsv,
  toTransaction,
  type PaymentData,
  type Transaction,
} from './payment-history-view';

const TABLE_PAGE_SIZE = 20;

export default function PaymentsPage2025() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedJobId = searchParams.get('jobId');
  const scopedPaymentId = searchParams.get('paymentId');
  const { user, loading: loadingUser } = useCurrentUser();
  const userId = user?.id;
  const { csrfToken } = useCSRF();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadedScope, setLoadedScope] = useState<string>();
  const [failedScope, setFailedScope] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [page, setPage] = useState(1);
  const scope = JSON.stringify([userId, scopedPaymentId, retryCount]);
  const loadingTransactions = loadedScope !== scope && failedScope !== scope;
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'completed' | 'refunded'
  >('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>(
    'all'
  );
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundRequestedAmount, setRefundRequestedAmount] = useState<number>();
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const refundInFlight = useRef(false);
  const confirm = useConfirm();
  // Hide the inline "Back to Dashboard" link when the Mint Editorial
  // shell is active — the persistent sidebar already provides nav, so
  // the legacy back link becomes redundant chrome.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    const fetchTransactions = async () => {
      try {
        const payments = await loadPaymentHistory<PaymentData>(
          controller.signal,
          scopedPaymentId
        );
        if (!controller.signal.aborted) {
          setTransactions(payments.map(toTransaction));
          setLoadedScope(scope);
        }
      } catch {
        if (!controller.signal.aborted) setFailedScope(scope);
      }
    };

    void fetchTransactions();
    return () => controller.abort();
  }, [userId, scopedPaymentId, scope]);

  const handleReleasePayment = async (transactionId: string) => {
    if (
      transactions.find((tx) => tx.id === transactionId)?.job_status !==
      'completed'
    ) {
      toast.error('Payment can only be approved after the work is completed.');
      return;
    }
    if (!csrfToken) {
      toast.error('Security token not loaded. Please refresh.');
      return;
    }

    // Explain approval and the cooling-off waiver before releasing funds.
    const transaction = transactions.find((t) => t.id === transactionId);
    const needsApproval = transaction ? !transaction.homeowner_approval : false;
    if (await explainCoolingOff(transaction?.cooling_off_ends_at, confirm))
      return;

    const confirmed = await confirm(
      needsApproval
        ? {
            title: 'Approve work and release payment?',
            description:
              'This will approve the work as satisfactorily completed and request payment release, subject to the remaining release checks.\n\n' +
              'You will be waiving the 48-hour cooling-off period you would normally get after approving, during which a payment can still be held back.\n\n' +
              'This cannot be undone.',
            confirmText: 'Approve & release',
            destructive: true,
          }
        : {
            title: 'Release this payment?',
            description:
              'Are you sure you want to release this payment? This action cannot be undone.',
            confirmText: 'Release payment',
            destructive: true,
          }
    );
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch('/api/payments/release-escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          escrowTransactionId: transactionId,
          releaseReason: 'job_completed',
          ...(needsApproval ? { approveAndWaiveCoolingOff: true } : {}),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : typeof data.error?.message === 'string'
              ? data.error.message
              : 'Failed to release payment. Please try again.'
        );
      }
      toast.success('Payment released successfully!');
      window.location.reload();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to release payment');
    }
  };

  const handleRefundPayment = async () => {
    if (!selectedTransaction || !csrfToken || !user || refundInFlight.current)
      return;
    if (!refundReason.trim()) {
      toast.error('Please provide a refund reason');
      return;
    }
    // refundRequestSchema requires both jobId and escrowTransactionId —
    // the transaction rows come from /api/payments/history (escrow rows),
    // so `id` IS the escrow transaction id and `job_id` its parent job.
    // Omitting `amount` requests a full refund, matching this modal.
    if (!selectedTransaction.job_id) {
      toast.error('This transaction has no linked job and cannot be refunded');
      return;
    }
    refundInFlight.current = true;
    setSubmittingRefund(true);
    try {
      await submitRefund(
        user.id,
        {
          jobId: selectedTransaction.job_id,
          escrowTransactionId: selectedTransaction.id,
          amount: refundRequestedAmount,
          reason: refundReason,
        },
        csrfToken
      );
      toast.success('Refund processed successfully!');
      setShowRefundModal(false);
      setRefundReason('');
      window.location.reload();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to process refund');
    } finally {
      refundInFlight.current = false;
      setSubmittingRefund(false);
    }
  };

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/payments');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen />;
  }
  if (!user) return null;

  // Escrow statuses — see /api/payments/history for the full set.
  // From the homeowner's perspective `held` and `release_pending`
  // are "money I've already parted with" — the only state where the
  // homeowner still owns the funds is `pending` (pre-charge) or
  // `refunded`. The previous filter put `release_pending` rows into
  // neither bucket so they silently disappeared from the stats and
  // the filter menu both.
  const scopedTransactions = (loadedScope === scope ? transactions : []).filter(
    (t) =>
      (!scopedJobId || t.job_id === scopedJobId) &&
      (!scopedPaymentId || t.id === scopedPaymentId)
  );
  const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
  const filteredTransactions = scopedTransactions.filter((t) => {
    let matchesStatus = true;
    if (filter === 'pending') {
      matchesStatus = t.status === 'pending' || t.status === 'held';
    } else if (filter === 'completed') {
      matchesStatus = ['completed', 'released', 'release_pending'].includes(
        t.status
      );
    } else if (filter === 'refunded') {
      matchesStatus = paymentAmounts(t).refunded > 0;
    }

    return (
      matchesStatus &&
      (dateRange === 'all' || Date.parse(t.created_at) >= cutoff)
    );
  });
  const pageCount = Math.max(
    1,
    Math.ceil(filteredTransactions.length / TABLE_PAGE_SIZE)
  );
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * TABLE_PAGE_SIZE;
  const visibleTransactions = filteredTransactions.slice(
    firstIndex,
    firstIndex + TABLE_PAGE_SIZE
  );

  // Rows that count as "paid" — money that has left the homeowner's card into
  // the platform (held/release_pending) or all the way through (completed/
  // released). `pending` rows are excluded because nothing has moved yet.
  // The "Across N transactions" subtitle must count THIS set, not
  // transactions.length, or the total and its caption disagree whenever a
  // pending row exists (e.g. £2.52 across 2 held rows shown as "3").
  const {
    totalPaid,
    paidTransactionCount,
    inEscrowAmount,
    refundedAmount,
    disputedAmount,
    releasedAmount,
  } = summarizePayments(filteredTransactions);
  // The "Protected" stat card previously showed pre-charge `pending`
  // rows — money that hadn't actually hit Mintenance's escrow yet. Now
  // it reflects the real "held in escrow by the platform" total:
  // `held` (waiting for the contractor to finish) + `release_pending`
  // (Stripe transfer is mid-flight back to the contractor). `pending`
  // stays out because nothing has moved for those rows.

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    const csvContent = paymentHistoryCsv(filteredTransactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mintenance-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Payment history exported as CSV');
  };

  return (
    <HomeownerPageWrapper>
      {/* `me-legacy-fit` palette-maps this still-legacy page's Tailwind
          classes onto the Mint Editorial tokens. The shim is self-gating
          — its selectors require a `.me-root` ancestor, which only the
          Mint Editorial shell provides — so opted-out users are
          unaffected. */}
      <div className='max-w-6xl mx-auto me-legacy-fit'>
        {/* Back link — only shown in legacy chrome. Sidebar nav handles
            this once the Mint Editorial shell is active. */}
        {!isMintEditorial && (
          <button
            onClick={() => router.push('/dashboard')}
            className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 group'
          >
            <ChevronLeft
              size={16}
              className='group-hover:-translate-x-0.5 transition-transform'
            />
            Back to Dashboard
          </button>
        )}

        <PaymentsHeader
          onExport={handleExport}
          exportDisabled={
            loadedScope !== scope || filteredTransactions.length === 0
          }
        />
        {(scopedJobId || scopedPaymentId) && (
          <p className='my-4' role='status'>
            Showing{' '}
            {scopedPaymentId
              ? 'the selected payment'
              : 'payments for the selected job'}
            .{' '}
            <button
              type='button'
              className='underline'
              onClick={() => router.push('/payments')}
            >
              Show all payments
            </button>
          </p>
        )}

        {loadedScope === scope && (
          <PaymentsStatsCards
            totalPaid={totalPaid}
            paidTransactionCount={paidTransactionCount}
            pendingAmount={inEscrowAmount}
            disputedAmount={disputedAmount}
            releasedAmount={releasedAmount}
            refundedAmount={refundedAmount}
            transactionCount={filteredTransactions.length}
          />
        )}

        <PaymentsFilters
          filter={filter}
          onFilterChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          dateRange={dateRange}
          onDateRangeChange={(value) => {
            setDateRange(value);
            setPage(1);
          }}
        />

        {failedScope === scope ? (
          <div
            role='alert'
            className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950'
          >
            Could not load the full payment history.{' '}
            <button
              type='button'
              className='underline'
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
          </div>
        ) : (
          <TransactionList
            transactions={visibleTransactions}
            loading={loadingTransactions}
            filter={filter}
            userRole={user?.role}
            onReleasePayment={handleReleasePayment}
            onRequestRefund={(transaction) => {
              try {
                const pending = readPendingRefund(user.id, transaction.id);
                const current = transactions.find(
                  (item) => item.id === transaction.id
                );
                if (!current)
                  throw new Error(
                    'Payment is no longer available. Refresh and retry.'
                  );
                if (current.refundNeedsReview)
                  throw new Error(
                    'This payment needs support review before another refund.'
                  );
                setSelectedTransaction(current);
                setRefundReason(pending?.body.reason ?? '');
                setRefundRequestedAmount(
                  pending
                    ? pending.body.amount
                    : (current.remainingAmount ?? current.amount)
                );
                setShowRefundModal(true);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'Could not recover refund request'
                );
              }
            }}
            onViewReceipt={(transaction) => {
              setSelectedTransaction(transaction);
              setShowReceiptModal(true);
            }}
          />
        )}
        {pageCount > 1 && (
          <nav
            aria-label='Payment history pages'
            className='mt-4 flex flex-wrap items-center justify-between gap-3'
          >
            <p role='status' className='text-sm'>
              Showing {firstIndex + 1}–
              {Math.min(
                firstIndex + TABLE_PAGE_SIZE,
                filteredTransactions.length
              )}{' '}
              of {filteredTransactions.length} payments
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </nav>
        )}

        <PaymentsRefundModal
          isOpen={showRefundModal && selectedTransaction !== null}
          amount={
            refundRequestedAmount ??
            selectedTransaction?.remainingAmount ??
            selectedTransaction?.amount ??
            0
          }
          submitting={submittingRefund}
          refundReason={refundReason}
          onReasonChange={setRefundReason}
          onClose={() => {
            setShowRefundModal(false);
            setRefundReason('');
          }}
          onConfirm={handleRefundPayment}
        />

        <PaymentsReceiptModal
          isOpen={showReceiptModal}
          transaction={selectedTransaction}
          onClose={() => setShowReceiptModal(false)}
        />
      </div>
    </HomeownerPageWrapper>
  );
}
