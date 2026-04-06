'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpRight className='w-4 h-4' />;
    if (trend === 'down') return <ArrowDownRight className='w-4 h-4' />;
    return <Minus className='w-4 h-4' />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 bg-green-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className='bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='text-teal-600'>{icon}</div>
          <p className='text-gray-600 text-sm font-medium'>{title}</p>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}
        >
          {getTrendIcon()}
          <span>
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        </div>
      </div>

      <div className='space-y-1'>
        <p className='text-3xl font-semibold text-gray-900'>{value}</p>
        <p className='text-xs text-gray-500'>{changeLabel}</p>
      </div>
    </div>
  );
};
