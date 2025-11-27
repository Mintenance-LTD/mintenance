import React from 'react';
import { theme } from '@/lib/theme';
import { MetricCard } from '@/components/ui/figma';
import { DashboardMetric } from './dashboard-metrics.types';
import { TrendSparkline } from '@/components/ui/TrendSparkline';

interface KpiCardsProps {
  metrics: DashboardMetric[];
}

export const KpiCards = React.memo(function KpiCards({ metrics }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className="group relative overflow-hidden bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        >
          {/* Gradient bar - appears on hover, always visible on large screens */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
          {/* Background Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/0 via-gray-50/50 to-gray-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* Content */}
          <div className="relative z-10">
            {/* Icon and Label */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {metric.icon && (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-50 to-secondary-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span style={{ color: metric.iconColor || theme.colors.secondary }}>
                      {metric.icon}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Label */}
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              {metric.label}
            </p>

            {/* Value */}
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
              {metric.value}
            </h3>

            {/* Subtitle */}
            {metric.subtitle && (
              <p className="text-sm font-medium text-gray-500 mb-3">
                {metric.subtitle}
              </p>
            )}

            {/* Trend with Sparkline */}
            {metric.trend && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendSparkline 
                    direction={metric.trend.direction} 
                    color={metric.trend.direction === 'up' ? theme.colors.secondary : theme.colors.error}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${
                    metric.trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {metric.trend.direction === 'up' ? '↑' : '↓'} {metric.trend.value}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

