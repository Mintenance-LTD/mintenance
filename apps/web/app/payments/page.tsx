'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { ChevronLeft } from 'lucide-react';
import { PaymentsHeader } from './components/PaymentsHeader';
import { PaymentsStatsCards } from './components/PaymentsStatsCards';
import { PaymentsFilters } from './components/PaymentsFilters';
import { TransactionList } from './components/TransactionList';
import { PaymentsRefundModal } from './components/PaymentsRefundModal';
import { PaymentsReceiptModal } from './components/PaymentsReceiptModal';

interface Transaction {
  id: string;
  amount: number;
  status:
    | 'pending'
    | 'held'
    | 'release_pending'
    | 'released'
    | 'refunded'
    | 'completed';
  type: 'payment' | 'refund' | 'escrow';
  created_at: string;
  updated_at: string;
  job_title?: string;
  job_id?: string;
  contractor_name?: string;
  contractor_id?: string;
  release_reason?: string;
  refund_reason?: string;
  platformFee?: number;
  processingFee?: number;
  subtotal?: number;
  /**
   * Whether the homeowner has already approved the work. Drives whether the
   * action reads "Release" or "Approve & Release" — releasing an unapproved
   * escrow requires the homeowner to also waive the 48-hour cooling-off
   * window, which needs its own confirmation copy.
   */
  homeowner_approval?: boolean;
  /** End of an active 48-hour cooling-off window, if one is running. */
  cooling_off_ends_at?: string;
}

interface PaymentData {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobId?: string;
  payerId?: string;
  payeeId?: string;
  job?: { title: string; description?: string } | null;
  payer?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  } | null;
  payee?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  job_id?: string;
  job_title?: string;
  contractor_name?: string;
  contractor_id?: string;
  transaction_type?: string;
  release_reason?: string;
  refund_reason?: string;
  homeownerApproval?: boolean;
  coolingOffEndsAt?: string;
}

export default function PaymentsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
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
    if (!user) return;

    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/payments/history');
        if (!response.ok) throw new Error('Failed to fetch transactions');

        const { payments } = await response.json();
        const transformedTransactions: Transaction[] = (payments || []).map(
          (t: PaymentData) => {
            const amount = Number(t.amount) || 0;
            const platformFee = amount * 0.05;
            const processingFee = amount * 0.02;

            // Prefer `company_name` when the payee has one set — a
            // contractor trading as "my Company LTD" should display that
            // over their personal Djodjo Nkouka name on the homeowner's
            // transaction list. Fall back to the first+last name when the
            // company field is empty.
            const contractorName =
              t.contractor_name ||
              t.payee?.company_name ||
              (t.payee
                ? `${t.payee.first_name || ''} ${t.payee.last_name || ''}`.trim()
                : undefined);

            const jobTitle = t.job_title || t.job?.title;

            return {
              id: t.id,
              amount,
              status: t.status,
              type: (t.transaction_type || 'payment') as Transaction['type'],
              created_at: t.created_at || t.createdAt,
              updated_at: t.updated_at || t.updatedAt,
              job_title: jobTitle,
              job_id: t.job_id || t.jobId,
              contractor_name: contractorName || undefined,
              contractor_id: t.contractor_id || t.payeeId,
              release_reason: t.release_reason,
              refund_reason: t.refund_reason,
              platformFee,
              processingFee,
              homeowner_approval: t.homeownerApproval ?? false,
              cooling_off_ends_at: t.coolingOffEndsAt,
            };
          }
        );
        setTransactions(transformedTransactions);
      } catch {
        toast.error('Failed to load payment history');
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const handleReleasePayment = async (transactionId: string) => {
    if (!csrfToken) {
      toast.error('Security token not loaded. Please refresh.');
      return;
    }

    // An escrow the homeowner has not yet approved cannot be released without
    // also waiving the 48-hour cooling-off window that approval would
    // normally open. That waiver has to be informed, so the confirm copy
    // spells out both halves of what the single click does — approving the
    // work AND giving up the window. Only send the waiver flag when the user
    // agreed to that specific wording.
    const transaction = transactions.find((t) => t.id === transactionId);
    const needsApproval = transaction ? !transaction.homeowner_approval : false;

    const confirmed = confirm(
      needsApproval
        ? 'This will approve the work as satisfactorily completed and immediately release the payment to the contractor.\n\n' +
            'You will be waiving the 48-hour cooling-off period you would normally get after approving, during which a payment can still be held back.\n\n' +
            'This cannot be undone. Continue?'
        : 'Are you sure you want to release this payment? This action cannot be undone.'
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
        throw new Error(data.error || 'Failed to release payment');
      }
      toast.success('Payment released successfully!');
      window.location.reload();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to release payment');
    }
  };

  const handleRefundPayment = async () => {
    if (!selectedTransaction || !csrfToken) return;
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
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          jobId: selectedTransaction.job_id,
          escrowTransactionId: selectedTransaction.id,
          reason: refundReason,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process refund');
      }
      toast.success('Refund processed successfully!');
      setShowRefundModal(false);
      setRefundReason('');
      window.location.reload();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to process refund');
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
  const filteredTransactions = transactions.filter((t) => {
    let matchesStatus = true;
    if (filter === 'pending') {
      matchesStatus = t.status === 'pending' || t.status === 'held';
    } else if (filter === 'completed') {
      matchesStatus = ['completed', 'released', 'release_pending'].includes(
        t.status
      );
    } else if (filter === 'refunded') {
      matchesStatus = t.status === 'refunded';
    }

    let matchesDateRange = true;
    if (dateRange !== 'all') {
      const transactionDate = new Date(t.created_at);
      const now = new Date();
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      );
      matchesDateRange = transactionDate >= cutoffDate;
    }
    return matchesStatus && matchesDateRange;
  });

  // Rows that count as "paid" — money that has left the homeowner's card into
  // the platform (held/release_pending) or all the way through (completed/
  // released). `pending` rows are excluded because nothing has moved yet.
  // The "Across N transactions" subtitle must count THIS set, not
  // transactions.length, or the total and its caption disagree whenever a
  // pending row exists (e.g. £2.52 across 2 held rows shown as "3").
  const paidTransactions = transactions.filter((t) =>
    ['completed', 'released', 'release_pending', 'held'].includes(t.status)
  );
  const totalPaid = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  const paidTransactionCount = paidTransactions.length;
  // The "Protected" stat card previously showed pre-charge `pending`
  // rows — money that hadn't actually hit Mintenance's escrow yet. Now
  // it reflects the real "held in escrow by the platform" total:
  // `held` (waiting for the contractor to finish) + `release_pending`
  // (Stripe transfer is mid-flight back to the contractor). `pending`
  // stays out because nothing has moved for those rows.
  const inEscrowAmount = transactions
    .filter((t) => ['held', 'release_pending'].includes(t.status))
    .reduce((sum, t) => sum + t.amount, 0);
  const refundedAmount = transactions
    .filter((t) => t.status === 'refunded')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    const csvHeaders = ['Date', 'Description', 'Amount (GBP)', 'Status'];
    const csvRows = filteredTransactions.map((t) => {
      const date = new Date(t.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const description = (t.job_title || 'Payment').replace(/"/g, '""');
      // escrow_transactions.amount is stored as a DECIMAL in pounds — the
      // previous `amount / 100` treated it as pence and exported £100 as
      // £1.00 (off by 100x). formatMoney on the stat cards already knew
      // this; the CSV path didn't.
      const amount = t.amount.toFixed(2);
      const status = t.status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `"${date}","${description}","${amount}","${status}"`;
    });
    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
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

        <PaymentsHeader onExport={handleExport} />

        <PaymentsStatsCards
          totalPaid={totalPaid}
          paidTransactionCount={paidTransactionCount}
          pendingAmount={inEscrowAmount}
          refundedAmount={refundedAmount}
          transactionCount={transactions.length}
        />

        <PaymentsFilters
          filter={filter}
          onFilterChange={setFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        <TransactionList
          transactions={filteredTransactions}
          loading={loadingTransactions}
          filter={filter}
          userRole={user?.role}
          onReleasePayment={handleReleasePayment}
          onRequestRefund={(transaction) => {
            setSelectedTransaction(transaction);
            setShowRefundModal(true);
          }}
          onViewReceipt={(transaction) => {
            setSelectedTransaction(transaction);
            setShowReceiptModal(true);
          }}
        />

        <PaymentsRefundModal
          isOpen={showRefundModal && selectedTransaction !== null}
          amount={selectedTransaction?.amount || 0}
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
