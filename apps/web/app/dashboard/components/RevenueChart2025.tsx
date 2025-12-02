'use client';

import React, { useState } from 'react';
import { AreaChart, Card, Title, Subtitle } from '@tremor/react';
import { fadeIn } from '@/lib/animations/variants';
import { MotionSection } from '@/components/ui/MotionDiv';

interface RevenueChart2025Props {
  data: Array<{ label: string; value: number }>;
  totalRevenue: number;
}

export function RevenueChart2025({ data, totalRevenue }: RevenueChart2025Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<'6m' | '1y' | 'all'>('1y');

  // Transform data for Tremor
  const chartData = data.map((item) => ({
    date: item.label,
    'Revenue': item.value,
  }));

  // Calculate growth percentage
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const growthPercentage = firstValue > 0
    ? (((lastValue - firstValue) / firstValue) * 100).toFixed(1)
    : '0';

  const isPositiveGrowth = parseFloat(growthPercentage) >= 0;

  return (
    <MotionSection
      className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Revenue Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your spending over time
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          {(['6m', '1y', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {period === '6m' ? '6 Months' : period === '1y' ? '1 Year' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
        <div>
          <div className="text-sm text-gray-600 mb-1">Total Spent</div>
          <div className="text-2xl font-bold text-gray-900">
            ${totalRevenue.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Average/Month</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(totalRevenue / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Growth</div>
          <div
            className={`text-2xl font-bold ${
              isPositiveGrowth ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isPositiveGrowth ? '+' : ''}{growthPercentage}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <AreaChart
          className="h-full"
          data={chartData}
          index="date"
          categories={['Revenue']}
          colors={['teal']}
          valueFormatter={(value) => `$${value.toLocaleString()}`}
          showAnimation={true}
          showLegend={false}
          showGridLines={true}
          showXAxis={true}
          showYAxis={true}
          curveType="natural"
        />
      </div>

      {/* Footer Insight */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {isPositiveGrowth ? '📈 Spending increased' : '📉 Spending decreased'}
            </h3>
            <p className="text-sm text-gray-600">
              Your spending has {isPositiveGrowth ? 'increased' : 'decreased'} by{' '}
              <span className="font-semibold">{Math.abs(parseFloat(growthPercentage))}%</span>{' '}
              compared to the previous period. {isPositiveGrowth
                ? 'Consider reviewing your budget allocation.'
                : 'Great job managing your expenses!'}
            </p>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
