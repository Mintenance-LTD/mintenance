'use client';

import React, { useEffect, useState } from 'react';
import { Banknote, Clock, RotateCcw, ReceiptPoundSterling } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { formatMoney } from '@/lib/utils/currency';

interface PaymentsStatsCardsProps {
  totalPaid: number;
  pendingAmount: number;
  refundedAmount: number;
  transactionCount: number;
}

/**
 * Payments KPI tiles. Under Mint Editorial we render the canonical
 * `.kpi` pattern from the design system (small sans label + big
 * Instrument Serif number + ghost subline, no colored accent bars).
 * Legacy theme keeps the colored left-border + gradient-icon design.
 *
 * Reference: redesign-v2/components.css `.kpi` and the dashboard
 * "Active jobs / Open bids / Held in escrow / Completed" row.
 */
export function PaymentsStatsCards({
  totalPaid,
  pendingAmount,
  refundedAmount,
  transactionCount,
}: PaymentsStatsCardsProps) {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div className='kpi'>
          <div className='label'>Total paid</div>
          <div className='num'>{formatMoney(totalPaid, 'GBP')}</div>
          <div className='sub'>
            <span>
              {transactionCount > 0
                ? `Across ${transactionCount} ${transactionCount === 1 ? 'transaction' : 'transactions'}`
                : 'No transactions yet'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Protected</div>
          <div className='num'>{formatMoney(pendingAmount, 'GBP')}</div>
          <div className='sub'>
            <span>
              {pendingAmount > 0 ? 'Held in escrow' : 'Nothing held yet'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Refunded</div>
          <div className='num'>{formatMoney(refundedAmount, 'GBP')}</div>
          <div className='sub'>
            <span>
              {refundedAmount > 0 ? 'Returned to you' : 'No refunds yet'}
            </span>
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Transactions</div>
          <div className='num'>{transactionCount}</div>
          <div className='sub'>
            <span>all-time</span>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Paid',
      value: formatMoney(totalPaid, 'GBP'),
      icon: Banknote,
      iconColor: 'text-emerald-600',
      bgIcon: 'bg-emerald-50',
      accent: 'border-l-emerald-500',
    },
    {
      label: 'Protected',
      value: formatMoney(pendingAmount, 'GBP'),
      icon: Clock,
      iconColor: 'text-amber-600',
      bgIcon: 'bg-amber-50',
      accent: 'border-l-amber-500',
    },
    {
      label: 'Refunded',
      value: formatMoney(refundedAmount, 'GBP'),
      icon: RotateCcw,
      iconColor: 'text-blue-600',
      bgIcon: 'bg-blue-50',
      accent: 'border-l-blue-500',
    },
    {
      label: 'Transactions',
      value: String(transactionCount),
      icon: ReceiptPoundSterling,
      iconColor: 'text-violet-600',
      bgIcon: 'bg-violet-50',
      accent: 'border-l-violet-500',
    },
  ];

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <MotionDiv
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`bg-white rounded-xl border border-gray-200 border-l-4 ${stat.accent} p-5 hover:shadow-md transition-shadow`}
          >
            <div className='flex items-center justify-between mb-3'>
              <span className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                {stat.label}
              </span>
              <div
                className={`w-9 h-9 rounded-lg ${stat.bgIcon} flex items-center justify-center`}
              >
                <Icon size={18} className={stat.iconColor} />
              </div>
            </div>
            <div className='text-2xl font-bold text-gray-900'>{stat.value}</div>
          </MotionDiv>
        );
      })}
    </div>
  );
}
