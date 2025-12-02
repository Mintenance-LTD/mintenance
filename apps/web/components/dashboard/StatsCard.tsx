'use client';

import React from 'react';
import { fadeIn } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  color?: 'teal' | 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  trend,
}: StatsCardProps) {
  const colorClasses = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', trendUp: 'text-teal-700', trendDown: 'text-rose-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', trendUp: 'text-emerald-700', trendDown: 'text-rose-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', trendUp: 'text-blue-700', trendDown: 'text-rose-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', trendUp: 'text-amber-700', trendDown: 'text-rose-700' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', trendUp: 'text-emerald-700', trendDown: 'text-rose-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', trendUp: 'text-purple-700', trendDown: 'text-rose-700' },
  };

  const colors = colorClasses[color];

  return (
    <MotionDiv
      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && trend.direction !== 'neutral' && (
              <span className={`text-xs font-semibold ${trend.direction === 'up' ? colors.trendUp : colors.trendDown}`}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
        )}
      </div>
    </MotionDiv>
  );
}
