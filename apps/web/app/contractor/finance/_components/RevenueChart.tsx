'use client';

import React from 'react';
import { DynamicAreaChart } from '@/components/charts';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
  revenueChartData: Array<{ month: string; revenue: number; jobs: number }>;
  timeRange: 'week' | 'month' | 'year';
  setTimeRange: (range: 'week' | 'month' | 'year') => void;
}

export function RevenueChart({
  revenueChartData,
  timeRange,
  setTimeRange,
}: RevenueChartProps) {
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>
            Revenue Overview
          </h2>
          <p className='text-sm text-gray-600 mt-1'>
            Monthly revenue trend (last 6 months)
          </p>
        </div>
        <div className='flex gap-1 bg-gray-100 p-1 rounded-lg'>
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width='100%' height={300}>
        <DynamicAreaChart data={revenueChartData}>
          <defs>
            <linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%' stopColor='#14B8A6' stopOpacity={0.3} />
              <stop offset='95%' stopColor='#14B8A6' stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' stroke='#E2E8F0' />
          <XAxis
            dataKey='month'
            stroke='#64748B'
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke='#64748B'
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `£${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: unknown) => [`£${value}`, 'Revenue']}
          />
          <Area
            type='monotone'
            dataKey='revenue'
            stroke='#14B8A6'
            strokeWidth={3}
            fillOpacity={1}
            fill='url(#colorRevenue)'
          />
        </DynamicAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
