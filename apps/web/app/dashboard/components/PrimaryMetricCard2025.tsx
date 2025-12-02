'use client';

import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cardHover, fadeIn } from '@/lib/animations/variants';
import type { DashboardMetric } from './dashboard-metrics.types';
import { MotionArticle, MotionDiv } from '@/components/ui/MotionDiv';

interface PrimaryMetricCardProps {
  metric: DashboardMetric;
}

export function PrimaryMetricCard2025({ metric }: PrimaryMetricCardProps) {
  // Generate sparkline data (simple upward/downward trend)
  const generateSparklineData = () => {
    const baseValue = 50;
    const trend = metric.trend?.direction === 'up' ? 1 : metric.trend?.direction === 'down' ? -1 : 0;

    return Array.from({ length: 12 }, (_, i) => ({
      value: baseValue + (trend * i * 2) + Math.random() * 10,
    }));
  };

  const sparklineData = generateSparklineData();

  return (
    <MotionArticle
      className="group relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col justify-between overflow-hidden"
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-card-hover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            {metric.label}
          </h3>
          {/* Icon placeholder - can be customized per metric */}
          {metric.trend && (
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                metric.trend.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-600'
                  : metric.trend.direction === 'down'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              {metric.trend.direction === 'up' ? '↑' : metric.trend.direction === 'down' ? '↓' : '→'}
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="flex items-baseline gap-2 mb-2">
          <MotionDiv
            className="text-4xl font-bold text-gray-900 tracking-tight"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {metric.value}
          </MotionDiv>
        </div>

        {/* Subtitle */}
        {metric.subtitle && (
          <div className="text-xs font-medium text-gray-500">
            {metric.subtitle}
          </div>
        )}
      </div>

      {/* Trend Section */}
      {metric.trend && metric.trend.direction !== 'neutral' && (
        <div className="relative z-10 mt-4 pt-4 border-t border-gray-100">
          {/* Sparkline Chart */}
          <div className="h-12 -mx-2 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={metric.trend.direction === 'up' ? '#10B981' : '#EF4444'}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={metric.trend.direction === 'up' ? '#10B981' : '#EF4444'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metric.trend.direction === 'up' ? '#10B981' : '#EF4444'}
                  strokeWidth={2}
                  fill={`url(#gradient-${metric.key})`}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trend Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">vs last period</span>
            <MotionDiv
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                metric.trend.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <span className="text-sm">
                {metric.trend.direction === 'up' ? '↑' : '↓'}
              </span>
              {metric.trend.value}
            </MotionDiv>
          </div>
        </div>
      )}
    </MotionArticle>
  );
}
