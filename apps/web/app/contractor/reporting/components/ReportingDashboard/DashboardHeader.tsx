'use client';

import React from 'react';
import { Download, FileText, Calendar, Printer } from 'lucide-react';
import type { DateRange } from './types';

interface DashboardHeaderProps {
  selectedPeriod: DateRange;
  setSelectedPeriod: (p: DateRange) => void;
  isLoading: boolean;
  handlePrint: () => void;
  handleExport: (format: 'csv' | 'pdf') => void;
}

const dateRanges: Array<{ value: DateRange; label: string }> = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  selectedPeriod,
  setSelectedPeriod,
  isLoading,
  handlePrint,
  handleExport,
}) => {
  return (
    <div className='bg-white border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-semibold text-gray-900'>
              Business Analytics
            </h1>
            <p className='text-gray-600 mt-1'>
              Track performance, revenue trends, and business insights
            </p>
          </div>

          <div className='flex gap-3'>
            <button
              onClick={handlePrint}
              className='px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2'
              disabled={isLoading}
            >
              <Printer className='w-5 h-5' />
              Print
            </button>
            <button
              onClick={() => handleExport('csv')}
              className='px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2'
              disabled={isLoading}
            >
              <FileText className='w-5 h-5' />
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className='px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2'
              disabled={isLoading}
            >
              <Download className='w-5 h-5' />
              Export PDF
            </button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className='mt-6 flex items-center gap-3 flex-wrap'>
          <div className='flex items-center gap-2 text-gray-600'>
            <Calendar className='w-5 h-5' />
            <span className='text-sm font-medium'>Time Period:</span>
          </div>
          <div className='flex gap-2 bg-gray-100 p-1 rounded-lg'>
            {dateRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setSelectedPeriod(range.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === range.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
