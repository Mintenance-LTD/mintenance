'use client';

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';

type StatusFilter = 'all' | 'pending' | 'completed' | 'refunded';
type DateRange = '7d' | '30d' | '90d' | 'all';

interface PaymentsFiltersProps {
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

/**
 * Mint Editorial branch: canonical `.chip / .chip.on` filter row +
 * `.field` styled date select. Legacy branch (default theme) keeps
 * the rounded pill group + bespoke select.
 */
export function PaymentsFilters({
  filter,
  onFilterChange,
  dateRange,
  onDateRangeChange,
}: PaymentsFiltersProps) {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Refunded', value: 'refunded' },
  ];

  if (isMintEditorial) {
    return (
      <div
        className='between'
        style={{
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type='button'
              className={'chip ' + (filter === opt.value ? 'on' : '')}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className='row' style={{ gap: 8, alignItems: 'center' }}>
          <Calendar
            size={14}
            strokeWidth={1.75}
            style={{ color: 'var(--me-ink-3)' }}
          />
          <select
            className='field'
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}
          >
            <option value='all'>All time</option>
            <option value='7d'>Last 7 days</option>
            <option value='30d'>Last 30 days</option>
            <option value='90d'>Last 90 days</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6'
    >
      {/* Status tabs */}
      <div className='inline-flex items-center bg-gray-100 rounded-xl p-1'>
        {statusOptions.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className='relative'>
        <Calendar
          size={14}
          className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'
        />
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
          className='pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer'
        >
          <option value='all'>All Time</option>
          <option value='7d'>Last 7 Days</option>
          <option value='30d'>Last 30 Days</option>
          <option value='90d'>Last 90 Days</option>
        </select>
      </div>
    </MotionDiv>
  );
}
