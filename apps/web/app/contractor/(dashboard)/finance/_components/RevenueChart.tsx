'use client';

import React, { useEffect, useState } from 'react';
import { DynamicAreaChart } from '@/components/charts';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartPalette } from '@/lib/charts/editorial-palette';

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
  const palette = useChartPalette();

  // 2026-05-13 polish pass: editorial-branched wrapper. Recharts
  // internals (axis stroke, gridlines, tooltip bg) already get their
  // colours from useChartPalette, so we only need to swap the card
  // shell + range toggle.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  return (
    <div
      className={
        isMintEditorial
          ? 'card card-pad'
          : 'bg-white rounded-xl border border-gray-200 p-6 mb-6'
      }
      style={isMintEditorial ? { marginBottom: 16 } : undefined}
    >
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className={isMintEditorial ? 't-h3' : 't-h3 text-gray-900'}>
            Revenue overview
          </h2>
          <p
            className={
              isMintEditorial ? 't-meta' : 'text-sm text-gray-600 mt-1'
            }
            style={isMintEditorial ? { marginTop: 2 } : undefined}
          >
            Monthly revenue trend (last 6 months)
          </p>
        </div>
        <div
          className='flex gap-1 p-1 rounded-lg'
          style={
            isMintEditorial
              ? { background: 'var(--me-bg-2)' }
              : { background: 'var(--me-bg-2, #F3F4F6)' }
          }
        >
          {(['week', 'month', 'year'] as const).map((range) => {
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={
                  isMintEditorial
                    ? 'px-4 py-1.5 rounded-md text-sm font-medium transition-colors'
                    : `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                }
                style={
                  isMintEditorial
                    ? {
                        background: isActive
                          ? 'var(--me-surface)'
                          : 'transparent',
                        color: isActive ? 'var(--me-ink)' : 'var(--me-ink-2)',
                        boxShadow: isActive
                          ? '0 1px 2px rgba(0,0,0,0.05)'
                          : undefined,
                      }
                    : undefined
                }
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width='100%' height={300}>
        <DynamicAreaChart data={revenueChartData}>
          <defs>
            <linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
              <stop
                offset='5%'
                stopColor={palette.recharts.primary}
                stopOpacity={0.3}
              />
              <stop
                offset='95%'
                stopColor={palette.recharts.primary}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke={palette.recharts.gridStroke}
          />
          <XAxis
            dataKey='month'
            stroke={palette.recharts.axisStroke}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke={palette.recharts.axisStroke}
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `£${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${palette.recharts.tooltipBorder}`,
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: palette.recharts.tooltipText,
            }}
            formatter={(value: unknown) => [`£${value}`, 'Revenue']}
          />
          <Area
            type='monotone'
            dataKey='revenue'
            stroke={palette.recharts.primary}
            strokeWidth={3}
            fillOpacity={1}
            fill='url(#colorRevenue)'
          />
        </DynamicAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
