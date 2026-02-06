'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payments | Mintenance',
  description: 'View your payment history, manage escrow transactions, and download receipts.',
};

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { LoadingSpinner } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import { ArrowLeft, Download, Calendar, Filter } from 'lucide-react';

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

  // Fetch transactions
  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/payments/history');
        if (!response.ok) throw new Error('Failed to fetch transactions');

        const { payments } = await response.json();

        interface PaymentData {
          id: string;
          amount: number;
          status: string;
          created_at: string;
          updated_at?: string;
          payer?: { id: string; email: string };
          payee?: { id: string; email: string };
          job?: { title: string } | null;
          job_id?: string;
          job_title?: string;
          type?: string;
          transaction_type?: string;
          reference?: string;
          contractor_id?: string;
          contractor_name?: string;
          release_reason?: string;
          refund_reason?: string;
        }

        const transformedTransactions: Transaction[] = (payments || []).map((t: PaymentData) => {
          const subtotal = t.amount / 1.2; // Remove 20% VAT
          const platformFee = t.amount * 0.05;
          const processingFee = t.amount * 0.02;

          return {
            id: t.id,
            amount: t.amount,
            status: t.status,
            type: t.transaction_type || 'payment',
            created_at: t.created_at,
            updated_at: t.updated_at,
            job_title: t.job_title,
            job_id: t.job_id,
            contractor_name: t.contractor_name,
            contractor_id: t.contractor_id,
            release_reason: t.release_reason,
            refund_reason: t.refund_reason,
            subtotal,
            platformFee,
            processingFee,
          };
        });

        setTransactions(transformedTransactions);
      } catch (error) {
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
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          escrowTransactionId: transactionId,
          releaseReason: 'job_completed',
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

    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
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

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/payments');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user) return null;

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    // Status filter
    let matchesStatus = true;
    if (filter === 'pending') matchesStatus = t.status === 'pending' || t.status === 'held';
    else if (filter === 'completed') matchesStatus = t.status === 'completed' || t.status === 'released';
    else if (filter === 'refunded') matchesStatus = t.status === 'refunded';

    // Date range filter
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

  // Calculate stats
  const totalPaid = transactions
    .filter((t) => t.status === 'completed' || t.status === 'released')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingAmount = transactions
    .filter((t) => t.status === 'pending' || t.status === 'held')
    .reduce((sum, t) => sum + t.amount, 0);

  const refundedAmount = transactions
    .filter((t) => t.status === 'refunded')
    .reduce((sum, t) => sum + t.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return 'bg-emerald-100 text-emerald-700 border-emerald-600';
      case 'pending':
      case 'held':
        return 'bg-amber-100 text-amber-700 border-amber-600';
      case 'refunded':
        return 'bg-rose-100 text-rose-700 border-rose-600';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return '✅';
      case 'pending':
      case 'held':
        return '⏳';
      case 'refunded':
        return '↩️';
      default:
        return '📋';
    }
  };

  const handleExport = () => {
    toast.success('Exporting payment data...');
  };

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  return (
    <HomeownerPageWrapper>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Dashboard</span>
      </button>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <MotionButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </MotionButton>
          </div>
          <p className="text-gray-600">Manage your payments and view transaction history</p>
        </MotionDiv>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Paid', value: formatMoney(totalPaid, 'GBP'), icon: '💰', bgColor: 'bg-green-50' },
            { label: 'Pending', value: formatMoney(pendingAmount, 'GBP'), icon: '⏳', bgColor: 'bg-yellow-50' },
            { label: 'Refunded', value: formatMoney(refundedAmount, 'GBP'), icon: '↩️', bgColor: 'bg-blue-50' },
            { label: 'Transactions', value: transactions.length, icon: '📋', bgColor: 'bg-gray-50' },
          ].map((stat, index) => (
            <MotionDiv
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bgColor} rounded-xl p-6 border border-gray-200`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{stat.icon}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </MotionDiv>
          ))}
        </div>

        {/* Filters */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Completed', value: 'completed' },
                { label: 'Refunded', value: 'refunded' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value as any)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filter === tab.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>
        </MotionDiv>

        {/* Payment Cards List */}
        {loadingTransactions ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner message="Loading transactions..." />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-12 text-center"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">
              {filter === 'all' ? 'You have no payment history yet' : `No ${filter} transactions`}
            </p>
          </MotionDiv>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredTransactions.map((transaction, index) => (
              <MotionDiv
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/payments/${transaction.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Job Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getStatusIcon(transaction.status)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {transaction.job_title || 'Payment'}
                        </h3>
                        {transaction.contractor_name && (
                          <p className="text-sm text-gray-600">
                            Contractor: {transaction.contractor_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(transaction.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Status */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatMoney(transaction.amount, 'GBP')}
                    </div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                      {transaction.status.toUpperCase()}
                    </span>

                    <div className="mt-3 flex gap-2">
                      {transaction.status === 'held' && user?.role === 'homeowner' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReleasePayment(transaction.id);
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Release
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransaction(transaction);
                              setShowRefundModal(true);
                            }}
                            className="px-3 py-1 bg-rose-600 text-white text-xs rounded-lg hover:bg-rose-700 transition-colors"
                          >
                            Refund
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewReceipt(transaction);
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        View Receipt
                      </button>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            ))}
          </div>
        )}

        {/* Refund Modal */}
        <AnimatePresence>
          {showRefundModal && selectedTransaction && (
            <MotionDiv
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRefundModal(false)}
            >
              <MotionDiv
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Refund</h2>
                <p className="text-gray-600 mb-4">
                  Refund amount: <span className="font-bold">{formatMoney(selectedTransaction.amount, 'GBP')}</span>
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason for refund <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Please explain why you're requesting a refund..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundReason('');
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefundPayment}
                    disabled={!refundReason.trim()}
                    className="px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Request Refund
                  </button>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Receipt Modal */}
        <AnimatePresence>
          {showReceiptModal && selectedTransaction && (
            <MotionDiv
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceiptModal(false)}
            >
              <MotionDiv
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Payment Receipt</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedTransaction.job_title || 'Payment'}</p>
                </div>

                <div className="p-6">
                  <PricingBreakdown
                    items={[
                      {
                        id: '1',
                        label: 'Service Cost',
                        amount: selectedTransaction.subtotal || selectedTransaction.amount / 1.2,
                      },
                      {
                        id: '2',
                        label: 'VAT (20%)',
                        amount: (selectedTransaction.subtotal || selectedTransaction.amount / 1.2) * 0.2,
                      },
                      {
                        id: '3',
                        label: 'Platform Fee (5%)',
                        amount: selectedTransaction.platformFee || selectedTransaction.amount * 0.05,
                      },
                      {
                        id: '4',
                        label: 'Processing Fee (2%)',
                        amount: selectedTransaction.processingFee || selectedTransaction.amount * 0.02,
                      },
                    ]}
                    subtotal={selectedTransaction.subtotal || selectedTransaction.amount / 1.2}
                    total={selectedTransaction.amount}
                    currency="£"
                  />

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setShowReceiptModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => toast.success('Downloading invoice...')}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </MotionDiv>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </HomeownerPageWrapper>
  );
}
