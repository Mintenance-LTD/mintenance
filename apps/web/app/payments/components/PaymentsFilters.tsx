'use client';

import React from 'react';
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

export function PaymentsFilters({
  filter,
  onFilterChange,
  dateRange,
  onDateRangeChange,
}: PaymentsFiltersProps) {
  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Refunded', value: 'refunded' },
  ];

  return (
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
          {statusOptions.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
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
            onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
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
  );
}
