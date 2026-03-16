'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { LoadingSpinner } from '@/components/ui';
import { formatMoney } from '@/lib/utils/currency';
import {
  CheckCircle2, Clock, RotateCcw, FileText,
  ArrowUpRight, ShieldCheck, CalendarDays, User,
} from 'lucide-react';

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

function getStatusConfig(status: string) {
  switch (status) {
    case 'completed':
    case 'released':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'pending':
    case 'held':
      return {
        label: status === 'held' ? 'In Escrow' : 'Pending',
        icon: Clock,
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        icon: RotateCcw,
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
      };
    default:
      return {
        label: status,
        icon: FileText,
        classes: 'bg-gray-50 text-gray-700 border-gray-200',
        dot: 'bg-gray-500',
      };
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
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner message="Loading transactions..." />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 p-16 text-center"
      >
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText size={28} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">No transactions found</h3>
        <p className="text-sm text-gray-500">
          {filter === 'all' ? 'Your payment history will appear here' : `No ${filter} transactions`}
        </p>
      </MotionDiv>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <div className="col-span-5">Description</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-1 text-center">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Transaction rows */}
      <div className="divide-y divide-gray-100">
        {transactions.map((transaction, index) => {
          const statusConfig = getStatusConfig(transaction.status);
          const StatusIcon = statusConfig.icon;

          return (
            <MotionDiv
              key={transaction.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="group px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/payments/${transaction.id}`)}
            >
              {/* Desktop layout */}
              <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                {/* Description */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} className="text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {transaction.job_title || 'Payment'}
                    </div>
                    {transaction.contractor_name && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <User size={11} />
                        {transaction.contractor_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-500">
                  <CalendarDays size={13} className="text-gray-400" />
                  {new Date(transaction.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>

                {/* Amount */}
                <div className="col-span-2 text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {formatMoney(transaction.amount, 'GBP')}
                  </div>
                  {transaction.platformFee != null && transaction.platformFee > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {formatMoney(transaction.platformFee, 'GBP')} fee
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusConfig.classes}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {transaction.status === 'held' && userRole === 'homeowner' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onReleasePayment(transaction.id); }}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Release
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRequestRefund(transaction); }}
                        className="px-3 py-1.5 bg-white text-rose-600 text-xs font-medium rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
                      >
                        Refund
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewReceipt(transaction); }}
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Receipt <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="md:hidden space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                      <ShieldCheck size={18} className="text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {transaction.job_title || 'Payment'}
                      </div>
                      {transaction.contractor_name && (
                        <div className="text-xs text-gray-500">{transaction.contractor_name}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-900">
                      {formatMoney(transaction.amount, 'GBP')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.classes}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewReceipt(transaction); }}
                      className="text-xs text-teal-600 font-medium"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              </div>
            </MotionDiv>
          );
        })}
      </div>
    </div>
  );
}
