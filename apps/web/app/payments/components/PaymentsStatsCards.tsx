'use client';

import React from 'react';
import { Banknote, Clock, RotateCcw, ClipboardList } from 'lucide-react';
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
    { label: 'Total Paid', value: formatMoney(totalPaid, 'GBP'), icon: <Banknote className="w-7 h-7 text-green-600" />, bgColor: 'bg-green-50' },
    { label: 'Pending', value: formatMoney(pendingAmount, 'GBP'), icon: <Clock className="w-7 h-7 text-yellow-600" />, bgColor: 'bg-yellow-50' },
    { label: 'Refunded', value: formatMoney(refundedAmount, 'GBP'), icon: <RotateCcw className="w-7 h-7 text-blue-600" />, bgColor: 'bg-blue-50' },
    { label: 'Transactions', value: transactionCount, icon: <ClipboardList className="w-7 h-7 text-gray-600" />, bgColor: 'bg-gray-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <MotionDiv
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`${stat.bgColor} rounded-xl p-6 border border-gray-200`}
        >
          <div className="flex items-center gap-3 mb-2">
            {stat.icon}
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
          <div className="text-gray-600 text-sm">{stat.label}</div>
        </MotionDiv>
      ))}
    </div>
  );
}
