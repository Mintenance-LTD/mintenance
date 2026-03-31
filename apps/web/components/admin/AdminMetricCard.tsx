'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import styles from '../../app/admin/admin.module.css';

interface Trend {
  direction: 'up' | 'down';
  value: string;
  label?: string;
}

interface AdminMetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  iconColor?: string;
  trend?: Trend;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function AdminMetricCard({
  label,
  value,
  icon,
  iconColor = '#0F172A',
  trend,
  subtitle,
  onClick,
  className,
}: AdminMetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] bg-white p-6 transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-[0_12px_32px_-4px_rgba(42,52,57,0.08)]',
        onClick && 'cursor-pointer',
        styles.metricCard,
        className
      )}
      onClick={onClick}
    >
      <div className='flex items-center justify-between mb-4'>
        <div
          className='w-10 h-10 rounded-xl flex items-center justify-center'
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon name={icon} size={20} color={iconColor || '#565e74'} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-[0.65rem] font-bold tracking-wider uppercase px-2 py-1 rounded-full',
              trend.direction === 'up'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className='text-[#566166] text-sm font-medium'>{label}</p>
        <p className='text-3xl font-bold text-[#2a3439] mt-1'>{value}</p>
        {subtitle && <p className='text-xs text-[#717c82] mt-2'>{subtitle}</p>}
      </div>
    </div>
  );
}
