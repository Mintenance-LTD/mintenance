'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { LoadingSpinner } from '@/components/ui';
import { formatMoney } from '@/lib/utils/currency';

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

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  filter: string;
  userRole?: string;
  onReleasePayment: (transactionId: string) => void;
  onRequestRefund: (transaction: Transaction) => void;
  onViewReceipt: (transaction: Transaction) => void;
}

function getStatusColor(status: string): string {
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
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
    case 'released':
      return '\u2705';
    case 'pending':
    case 'held':
      return '\u23F3';
    case 'refunded':
      return '\u21A9\uFE0F';
    default:
      return '\uD83D\uDCCB';
  }
}

export function TransactionList({
  transactions,
  loading,
  filter,
  userRole,
  onReleasePayment,
  onRequestRefund,
  onViewReceipt,
}: TransactionListProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner message="Loading transactions..." />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-12 text-center"
      >
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl font-bold text-gray-400">&pound;</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No transactions found</h3>
        <p className="text-gray-600">
          {filter === 'all' ? 'You have no payment history yet' : `No ${filter} transactions`}
        </p>
      </MotionDiv>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {transactions.map((transaction, index) => (
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
              <div className="text-2xl font-bold text-gray-900">
                {formatMoney(transaction.amount, 'GBP')}
              </div>
              {transaction.platformFee != null && transaction.platformFee > 0 && (
                <p className="text-[11px] text-gray-400 mb-1">
                  incl. {formatMoney(transaction.platformFee, 'GBP')} platform + {formatMoney(transaction.processingFee || 0, 'GBP')} processing
                </p>
              )}
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                {transaction.status.toUpperCase()}
              </span>

              <div className="mt-3 flex gap-2">
                {transaction.status === 'held' && userRole === 'homeowner' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReleasePayment(transaction.id);
                      }}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Release
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestRefund(transaction);
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
                    onViewReceipt(transaction);
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
  );
}
