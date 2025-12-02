'use client';

import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { cardHover } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface ContractorMetricCard2025Props {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  color?: 'teal' | 'emerald' | 'blue' | 'amber' | 'rose';
}

export function ContractorMetricCard2025({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'teal',
}: ContractorMetricCard2025Props) {
  // Color mappings
  const colorClasses = {
    teal: {
      iconBg: 'bg-teal-50',
      iconText: 'text-teal-600',
      trendUp: 'bg-teal-50 text-teal-700',
      trendDown: 'bg-rose-50 text-rose-700',
      strokeColor: '#0D9488',
    },
    emerald: {
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      trendUp: 'bg-emerald-50 text-emerald-700',
      trendDown: 'bg-rose-50 text-rose-700',
      strokeColor: '#10B981',
    },
    blue: {
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      trendUp: 'bg-blue-50 text-blue-700',
      trendDown: 'bg-rose-50 text-rose-700',
      strokeColor: '#3B82F6',
    },
    amber: {
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-600',
      trendUp: 'bg-amber-50 text-amber-700',
      trendDown: 'bg-rose-50 text-rose-700',
      strokeColor: '#F59E0B',
    },
    rose: {
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-600',
      trendUp: 'bg-emerald-50 text-emerald-700',
      trendDown: 'bg-rose-50 text-rose-700',
      strokeColor: '#EF4444',
    },
  };

  const colors = colorClasses[color];

  // Generate sparkline data
  const generateSparklineData = () => {
    const baseValue = 50;
    const trendValue = trend?.direction === 'up' ? 1 : trend?.direction === 'down' ? -1 : 0;

    return Array.from({ length: 12 }, (_, i) => ({
      value: baseValue + (trendValue * i * 2) + Math.random() * 10,
    }));
  };

  const sparklineData = generateSparklineData();

  return (
    <MotionDiv
      className="group bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden relative"
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
    >
      {/* Gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-card-hover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
            {title}
          </h3>
          {icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg} ${colors.iconText}`}>
              {icon}
            </div>
          )}
        </div>

        {/* Main Value */}
        <MotionDiv
          className="text-4xl font-bold text-gray-900 tracking-tight mb-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {value}
        </MotionDiv>

        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs font-medium text-gray-500 mb-4">
            {subtitle}
          </div>
        )}

        {/* Trend Section */}
        {trend && trend.direction !== 'neutral' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {/* Sparkline */}
            <div className="h-12 -mx-2 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={colors.strokeColor}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={colors.strokeColor}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.strokeColor}
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">vs last month</span>
              <MotionDiv
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                  trend.direction === 'up' ? colors.trendUp : colors.trendDown
                }`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <span className="text-sm">
                  {trend.direction === 'up' ? '↑' : '↓'}
                </span>
                {trend.value}
              </MotionDiv>
            </div>
          </div>
        )}
      </div>
    </MotionDiv>
  );
}
