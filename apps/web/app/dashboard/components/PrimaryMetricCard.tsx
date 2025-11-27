'use client';

import React from 'react';
import { TrendSparkline } from '@/components/ui/TrendSparkline';
import { theme } from '@/lib/theme';
import type { DashboardMetric } from './dashboard-metrics.types';

interface PrimaryMetricCardProps {
  metric: DashboardMetric;
}

export function PrimaryMetricCard({ metric }: PrimaryMetricCardProps) {
  return (
    <article className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600">{metric.label}</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-gray-900 tracking-tight">
            {metric.value}
          </div>
        </div>
        {metric.subtitle && (
          <div className="text-xs font-medium text-gray-400 mt-1">
            {metric.subtitle}
          </div>
        )}
      </div>

      {metric.trend && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
          <TrendSparkline 
            direction={metric.trend.direction} 
            color={metric.trend.direction === 'up' ? theme.colors.secondary : theme.colors.error}
          />
          <div className={`inline-flex items-center gap-1 text-xs font-bold ${
            metric.trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            <span>{metric.trend.direction === 'up' ? '↑' : '↓'}</span>
            {metric.trend.value}
          </div>
        </div>
      )}
    </article>
  );
}

