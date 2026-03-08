'use client';

import React from 'react';
import { Banknote, Clock, RotateCcw, Receipt } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { formatMoney } from '@/lib/utils/currency';

interface PaymentsStatsCardsProps {
  totalPaid: number;
  pendingAmount: number;
  refundedAmount: number;
  transactionCount: number;
}

export function PaymentsStatsCards({
  totalPaid,
  pendingAmount,
  refundedAmount,
  transactionCount,
}: PaymentsStatsCardsProps) {
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
      label: 'In Escrow',
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
      icon: Receipt,
      iconColor: 'text-violet-600',
      bgIcon: 'bg-violet-50',
      accent: 'border-l-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{stat.label}</span>
              <div className={`w-9 h-9 rounded-lg ${stat.bgIcon} flex items-center justify-center`}>
                <Icon size={18} className={stat.iconColor} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </MotionDiv>
        );
      })}
    </div>
  );
}
