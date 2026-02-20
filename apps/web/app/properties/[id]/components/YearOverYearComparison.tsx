'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: string;
  amount: number;
  date: string;
  category: string;
}

interface YearData {
  year: number;
  totalSpent: number;
  jobCount: number;
  categories: string[];
}

function getYearData(jobs: Job[], year: number): YearData {
  const yearJobs = jobs.filter(j => {
    const jobYear = new Date(j.date).getFullYear();
    return jobYear === year && j.status === 'completed';
  });

  return {
    year,
    totalSpent: yearJobs.reduce((sum, j) => sum + j.amount, 0),
    jobCount: yearJobs.length,
    categories: [...new Set(yearJobs.map(j => j.category).filter(Boolean))],
  };
}

function ChangeIndicator({ current, previous, format = 'number' }: { current: number; previous: number; format?: 'number' | 'currency' }) {
  if (previous === 0 && current === 0) {
    return <span className="flex items-center gap-0.5 text-gray-400 text-[10px]"><Minus className="w-3 h-3" /> No data</span>;
  }
  if (previous === 0) {
    return <span className="flex items-center gap-0.5 text-blue-600 text-[10px]">New</span>;
  }

  const pctChange = ((current - previous) / previous) * 100;
  const isUp = pctChange > 0;
  const isFlat = Math.abs(pctChange) < 1;

  if (isFlat) {
    return <span className="flex items-center gap-0.5 text-gray-400 text-[10px]"><Minus className="w-3 h-3" /> No change</span>;
  }

  return (
    <span className={`flex items-center gap-0.5 text-[10px] ${isUp ? 'text-red-500' : 'text-green-600'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pctChange).toFixed(0)}% {isUp ? 'more' : 'less'}
    </span>
  );
}

export default function YearOverYearComparison({ jobs }: { jobs: Job[] }) {
  const currentYear = new Date().getFullYear();
  const currentData = getYearData(jobs, currentYear);
  const previousData = getYearData(jobs, currentYear - 1);

  const hasAnyData = currentData.jobCount > 0 || previousData.jobCount > 0;

  if (!hasAnyData) {
    return (
      <div className="p-4 border border-gray-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-teal-600" />
          <h4 className="text-sm font-semibold text-gray-900">Year-over-Year</h4>
        </div>
        <p className="text-xs text-gray-500">Complete some jobs to see year-over-year comparison data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-teal-600" />
        <h4 className="text-sm font-semibold text-gray-900">Year-over-Year</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Current Year */}
        <div className="p-2.5 bg-teal-50 rounded-lg border border-teal-100">
          <div className="text-[10px] text-teal-600 font-medium mb-1">{currentYear}</div>
          <div className="text-lg font-bold text-gray-900">£{currentData.totalSpent.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500">{currentData.jobCount} job{currentData.jobCount !== 1 ? 's' : ''}</div>
        </div>

        {/* Previous Year */}
        <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-[10px] text-gray-500 font-medium mb-1">{currentYear - 1}</div>
          <div className="text-lg font-bold text-gray-900">£{previousData.totalSpent.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500">{previousData.jobCount} job{previousData.jobCount !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Change Indicators */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Spend change</span>
          <ChangeIndicator current={currentData.totalSpent} previous={previousData.totalSpent} format="currency" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Job volume</span>
          <ChangeIndicator current={currentData.jobCount} previous={previousData.jobCount} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Categories</span>
          <span className="text-[10px] text-gray-500">{currentData.categories.length} this year</span>
        </div>
      </div>
    </div>
  );
}
