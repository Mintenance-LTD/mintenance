'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { MotionDiv } from '@/components/ui/MotionDiv';

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
}

export default function PaymentsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'refunded'>('all');
  const [showRefundModal, setShowRefundModal] = useState(false);
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

        const transformedTransactions: Transaction[] = (payments || []).map((t: PaymentData) => ({
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
        }));

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
    if (filter === 'all') return true;
    if (filter === 'pending') return t.status === 'pending' || t.status === 'held';
    if (filter === 'completed') return t.status === 'completed' || t.status === 'released';
    if (filter === 'refunded') return t.status === 'refunded';
    return true;
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole={user.role}
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: (user as any).profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <h1 className="text-4xl font-bold mb-2">Payment History</h1>
            <p className="text-teal-100 text-lg">View and manage your payments and transactions</p>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-6 mt-8">
              {[
                { label: 'Total Paid', value: formatMoney(totalPaid, 'GBP'), icon: '💰', color: 'emerald' },
                { label: 'Pending', value: formatMoney(pendingAmount, 'GBP'), icon: '⏳', color: 'amber' },
                { label: 'Refunded', value: formatMoney(refundedAmount, 'GBP'), icon: '↩️', color: 'rose' },
                { label: 'Transactions', value: transactions.length, icon: '📋', color: 'blue' },
              ].map((stat) => (
                <MotionDiv
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                  variants={staggerItem}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stat.icon}</span>
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-teal-100 text-sm">{stat.label}</div>
                    </div>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1600px] mx-auto px-8 py-8 w-full">
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <MotionDiv
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
              variants={fadeIn}
              initial="initial"
              animate="animate"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Filter:</span>
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Refunded', value: 'refunded' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value as any)}
                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                      filter === tab.value
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </MotionDiv>

            {/* Transactions List */}
            {loadingTransactions ? (
              <LoadingSpinner message="Loading transactions..." />
            ) : filteredTransactions.length === 0 ? (
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 p-12 text-center"
                variants={fadeIn}
                initial="initial"
                animate="animate"
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
              <MotionDiv
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                variants={fadeIn}
                initial="initial"
                animate="animate"
              >
                <div className="divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <MotionDiv
                      key={transaction.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                      variants={cardHover}
                      initial="rest"
                      whileHover="hover"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{getStatusIcon(transaction.status)}</span>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {transaction.job_title || 'Payment'}
                              </h3>
                              {transaction.contractor_name && (
                                <p className="text-sm text-gray-600">
                                  To: {transaction.contractor_name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${getStatusColor(transaction.status)}`}>
                              {transaction.status.toUpperCase()}
                            </span>
                          </div>

                          {(transaction.release_reason || transaction.refund_reason) && (
                            <p className="text-sm text-gray-600 italic">
                              {transaction.release_reason || transaction.refund_reason}
                            </p>
                          )}
                        </div>

                        {/* Right: Amount & Actions */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 mb-2">
                            {formatMoney(transaction.amount, 'GBP')}
                          </div>

                          {transaction.status === 'held' && user.role === 'homeowner' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReleasePayment(transaction.id)}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Release
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setShowRefundModal(true);
                                }}
                                className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 transition-colors"
                              >
                                Refund
                              </button>
                            </div>
                          )}

                          {transaction.job_id && (
                            <button
                              onClick={() => router.push(`/jobs/${transaction.job_id}`)}
                              className="text-sm text-teal-600 hover:text-teal-700 font-medium mt-2"
                            >
                              View Job →
                            </button>
                          )}
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </div>
              </MotionDiv>
            )}
          </div>
        </div>

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
      </main>
    </div>
  );
}
