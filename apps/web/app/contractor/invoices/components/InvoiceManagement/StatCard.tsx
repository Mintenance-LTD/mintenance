'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Stat Card Component — theme-aware. When Mint Editorial is active,
// renders the canonical `.kpi` tile (.label / .num / .sub stack).
// Otherwise renders the legacy white card with teal icon + slate
// typography.
export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) => {
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return (
      <div className='kpi'>
        <div className='label'>{title}</div>
        <div className='num'>{value}</div>
        {trend && trendLabel ? (
          <div
            className={trend === 'up' ? 'delta-up' : 'delta-down'}
            style={{
              fontSize: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
            }}
          >
            {trend === 'up' ? (
              <TrendingUp className='w-3.5 h-3.5' />
            ) : (
              <TrendingDown className='w-3.5 h-3.5' />
            )}
            {trendLabel}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all'>
      <div className='flex items-center gap-2 mb-2'>
        <Icon className='w-6 h-6 text-teal-600' />
        <p className='text-gray-600 text-sm font-medium'>{title}</p>
      </div>
      <div className='flex items-end justify-between'>
        <p className='text-2xl font-semibold text-gray-900'>{value}</p>
        {trend && trendLabel && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className='w-4 h-4' />
            ) : (
              <TrendingDown className='w-4 h-4' />
            )}
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  );
};
