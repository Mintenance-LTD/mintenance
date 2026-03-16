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
  status: 'pending' | 'held' | 'released' | 'refunded' | 'completed';
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
  payer?: { first_name: string; last_name: string } | null;
  payee?: { first_name: string; last_name: string } | null;
  created_at?: string;
  updated_at?: string;
  job_id?: string;
  job_title?: string;
  contractor_name?: string;
  contractor_id?: string;
  transaction_type?: string;
  release_reason?: string;
  refund_reason?: string;
}

export default function PaymentsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'refunded'>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/payments/history');
        if (!response.ok) throw new Error('Failed to fetch transactions');

        const { payments } = await response.json();
        const transformedTransactions: Transaction[] = (payments || []).map((t: PaymentData) => {
          const amount = Number(t.amount) || 0;
          const platformFee = amount * 0.05;
          const processingFee = amount * 0.02;

          const contractorName = t.contractor_name
            || (t.payee ? `${t.payee.first_name || ''} ${t.payee.last_name || ''}`.trim() : undefined);

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
          };
        });
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
    if (!confirm('Are you sure you want to release this payment? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch('/api/payments/release-escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ escrowTransactionId: transactionId, releaseReason: 'job_completed' }),
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
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ transactionId: selectedTransaction.id, reason: refundReason }),
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

  const filteredTransactions = transactions.filter((t) => {
    let matchesStatus = true;
    if (filter === 'pending') matchesStatus = t.status === 'pending' || t.status === 'held';
    else if (filter === 'completed') matchesStatus = t.status === 'completed' || t.status === 'released';
    else if (filter === 'refunded') matchesStatus = t.status === 'refunded';

    let matchesDateRange = true;
    if (dateRange !== 'all') {
      const transactionDate = new Date(t.created_at);
      const now = new Date();
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      matchesDateRange = transactionDate >= cutoffDate;
    }
    return matchesStatus && matchesDateRange;
  });

  const totalPaid = transactions
    .filter((t) => t.status === 'completed' || t.status === 'released')
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingAmount = transactions
    .filter((t) => t.status === 'pending' || t.status === 'held')
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
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const description = (t.job_title || 'Payment').replace(/"/g, '""');
      const amount = (t.amount / 100).toFixed(2);
      const status = t.status.charAt(0).toUpperCase() + t.status.slice(1);
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
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </button>

        <PaymentsHeader onExport={handleExport} />

        <PaymentsStatsCards
          totalPaid={totalPaid}
          pendingAmount={pendingAmount}
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
          onClose={() => { setShowRefundModal(false); setRefundReason(''); }}
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
