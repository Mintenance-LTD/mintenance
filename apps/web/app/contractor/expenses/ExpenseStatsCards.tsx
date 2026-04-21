'use client';

import type { Variants } from 'framer-motion';
import {
  PoundSterling,
  ReceiptPoundSterling,
  Tag,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface StatsShape {
  total: number;
  billable: number;
  nonBillable: number;
  change: number;
}

interface ExpenseStatsCardsProps {
  stats: StatsShape;
  totalItems: number;
  staggerContainer: Variants;
  staggerItem: Variants;
}

const fmt = (n: number) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: 2 });

export function ExpenseStatsCards({
  stats,
  totalItems,
  staggerContainer,
  staggerItem,
}: ExpenseStatsCardsProps) {
  return (
    <MotionDiv
      variants={staggerContainer}
      initial='hidden'
      animate='visible'
      className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6'
    >
      <MotionDiv
        variants={staggerItem}
        className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
      >
        <div className='flex items-center justify-between mb-4'>
          <div className='p-3 bg-emerald-100 rounded-lg'>
            <PoundSterling className='w-6 h-6 text-emerald-600' />
          </div>
          {stats.change !== 0 && (
            <div
              className={`flex items-center gap-1 text-sm ${stats.change > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {stats.change > 0 ? (
                <TrendingUp className='w-4 h-4' />
              ) : (
                <TrendingDown className='w-4 h-4' />
              )}
              {Math.abs(stats.change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className='text-sm text-gray-600 mb-1'>Total Expenses</p>
        <p className='text-2xl font-bold text-gray-900'>£{fmt(stats.total)}</p>
      </MotionDiv>

      <MotionDiv
        variants={staggerItem}
        className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
      >
        <div className='p-3 bg-green-100 rounded-lg mb-4 w-fit'>
          <ReceiptPoundSterling className='w-6 h-6 text-green-600' />
        </div>
        <p className='text-sm text-gray-600 mb-1'>Billable Expenses</p>
        <p className='text-2xl font-bold text-gray-900'>
          £{fmt(stats.billable)}
        </p>
      </MotionDiv>

      <MotionDiv
        variants={staggerItem}
        className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
      >
        <div className='p-3 bg-blue-100 rounded-lg mb-4 w-fit'>
          <Tag className='w-6 h-6 text-blue-600' />
        </div>
        <p className='text-sm text-gray-600 mb-1'>Non-Billable</p>
        <p className='text-2xl font-bold text-gray-900'>
          £{fmt(stats.nonBillable)}
        </p>
      </MotionDiv>

      <MotionDiv
        variants={staggerItem}
        className='bg-white rounded-xl shadow-lg border border-gray-200 p-6'
      >
        <div className='p-3 bg-purple-100 rounded-lg mb-4 w-fit'>
          <FileText className='w-6 h-6 text-purple-600' />
        </div>
        <p className='text-sm text-gray-600 mb-1'>Total Items</p>
        <p className='text-2xl font-bold text-gray-900'>{totalItems}</p>
      </MotionDiv>
    </MotionDiv>
  );
}
