'use client';

/**
 * Legacy Tailwind /analytics layout. Extracted from page.tsx so the
 * server-component shell stays under the 500-line MDC cap once the
 * escrow-bridge logic landed (the page used to be all-in-one).
 *
 * Default-theme users render this. Mint Editorial users render
 * `MintEditorialAnalytics` instead. Both consume the same metrics /
 * spendingData / categoryData shapes computed once in page.tsx.
 */

import React from 'react';
import { AreaChart, BarChart, DonutChart } from '@tremor/react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import {
  fadeIn,
  staggerContainer,
  staggerItem,
} from '@/lib/animations/variants';

export interface AnalyticsMetric {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

interface Props {
  loading: boolean;
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year';
  onPeriodChange: (period: 'week' | 'month' | 'quarter' | 'year') => void;
  metrics: AnalyticsMetric[];
  spendingData: Array<{ month: string; spending: number; jobs: number }>;
  categoryData: Array<{ category: string; spending: number }>;
}

const PERIODS: {
  label: string;
  value: 'week' | 'month' | 'quarter' | 'year';
}[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

export function LegacyAnalyticsView({
  loading,
  selectedPeriod,
  onPeriodChange,
  metrics,
  spendingData,
  categoryData,
}: Props) {
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      {/* Hero Header */}
      <MotionDiv
        className='bg-white border border-gray-200 rounded-xl p-4 sm:p-6 md:p-8 mb-6'
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-8'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 sm:w-16 sm:h-16 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-200'>
              <svg
                className='w-7 h-7 sm:w-9 sm:h-9 text-teal-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl sm:text-4xl font-bold mb-1 text-gray-900'>
                Analytics &amp; Insights
              </h1>
              <p className='text-gray-600 text-sm sm:text-lg'>
                Track your spending and project trends
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div className='flex items-center gap-1 sm:gap-2 bg-gray-100 rounded-xl p-1 border border-gray-200 self-start overflow-x-auto'>
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => onPeriodChange(period.value)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all whitespace-nowrap ${
                  selectedPeriod === period.value
                    ? 'bg-white text-teal-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </MotionDiv>

      {/* Content */}
      <div className='w-full space-y-6'>
        {loading ? (
          <div className='flex items-center justify-center py-20'>
            <div className='animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-600'></div>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <MotionDiv
              className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6'
              variants={staggerContainer}
              initial='initial'
              animate='animate'
            >
              {metrics.map((metric) => (
                <MotionDiv
                  key={metric.label}
                  className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'
                  variants={staggerItem}
                >
                  <div className='flex items-start justify-between mb-4'>
                    <div className='w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600'>
                      {metric.icon}
                    </div>
                    {metric.change ? (
                      <div
                        className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                          metric.changeType === 'positive'
                            ? 'bg-emerald-100 text-emerald-700'
                            : metric.changeType === 'negative'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {metric.change}
                      </div>
                    ) : null}
                  </div>
                  <div className='text-3xl font-bold text-gray-900 mb-1'>
                    {metric.value}
                  </div>
                  <div className='text-sm text-gray-600'>{metric.label}</div>
                </MotionDiv>
              ))}
            </MotionDiv>

            {/* Charts Row */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
              <MotionDiv
                className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'
                variants={fadeIn}
                initial='initial'
                animate='animate'
              >
                <h2 className='text-xl font-bold text-gray-900 mb-4'>
                  Spending Over Time
                </h2>
                <AreaChart
                  data={spendingData}
                  index='month'
                  categories={['spending']}
                  colors={['teal']}
                  valueFormatter={(value) => `£${value.toLocaleString()}`}
                  showAnimation={true}
                  showLegend={false}
                  showGridLines={false}
                  className='h-64 sm:h-80'
                />
              </MotionDiv>

              <MotionDiv
                className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'
                variants={fadeIn}
                initial='initial'
                animate='animate'
              >
                <h2 className='text-xl font-bold text-gray-900 mb-4'>
                  Spending by Category
                </h2>
                <DonutChart
                  data={categoryData}
                  category='spending'
                  index='category'
                  colors={['teal', 'emerald', 'cyan', 'sky', 'blue']}
                  valueFormatter={(value) => `£${value.toLocaleString()}`}
                  showAnimation={true}
                  className='h-64 sm:h-80'
                />
              </MotionDiv>
            </div>

            {/* Job Completion Trend */}
            <MotionDiv
              className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6'
              variants={fadeIn}
              initial='initial'
              animate='animate'
            >
              <h2 className='text-xl font-bold text-gray-900 mb-4'>
                Job Completion Trend
              </h2>
              <BarChart
                data={spendingData}
                index='month'
                categories={['jobs']}
                colors={['emerald']}
                valueFormatter={(value) => `${value} jobs`}
                showAnimation={true}
                showLegend={false}
                className='h-80'
              />
            </MotionDiv>

            {/* Category Details Table */}
            <MotionDiv
              className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'
              variants={fadeIn}
              initial='initial'
              animate='animate'
            >
              <h2 className='text-xl font-bold text-gray-900 mb-4'>
                Category Breakdown
              </h2>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-gray-200'>
                      <th className='text-left py-3 px-4 font-semibold text-gray-700'>
                        Category
                      </th>
                      <th className='text-right py-3 px-4 font-semibold text-gray-700'>
                        Total Spent
                      </th>
                      <th className='text-right py-3 px-4 font-semibold text-gray-700'>
                        % of Total
                      </th>
                      <th className='text-right py-3 px-4 font-semibold text-gray-700'>
                        Jobs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData
                      .sort((a, b) => b.spending - a.spending)
                      .map((category) => {
                        const totalSpending = categoryData.reduce(
                          (sum, c) => sum + c.spending,
                          0
                        );
                        const percentage = totalSpending
                          ? ((category.spending / totalSpending) * 100).toFixed(
                              1
                            )
                          : '0.0';
                        return (
                          <tr
                            key={category.category}
                            className='border-b border-gray-100 hover:bg-gray-50'
                          >
                            <td className='py-3 px-4 font-medium text-gray-900'>
                              {category.category}
                            </td>
                            <td className='py-3 px-4 text-right font-semibold text-emerald-600'>
                              £{category.spending.toLocaleString()}
                            </td>
                            <td className='py-3 px-4 text-right text-gray-700'>
                              {percentage}%
                            </td>
                            <td className='py-3 px-4 text-right text-gray-700'>
                              —
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </MotionDiv>
          </>
        )}
      </div>
    </HomeownerPageWrapper>
  );
}
