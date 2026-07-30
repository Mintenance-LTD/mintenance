'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  max,
  color,
  icon,
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className='bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-3'>
          <div className={`${color}`}>{icon}</div>
          <span className='text-sm font-medium text-gray-700'>{label}</span>
        </div>
        <span className='text-lg font-semibold text-gray-900'>{value}%</span>
      </div>

      <div className='w-full bg-gray-100 rounded-full h-2 overflow-hidden'>
        <div
          className={`h-full ${color.replace('text-', 'bg-')} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
