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
        'rounded-[12px] border border-slate-200 bg-white p-4 h-32 transition-all duration-300',
        'shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]',
        onClick && 'cursor-pointer hover:-translate-y-1 active:translate-y-0',
        styles.metricCard,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 h-full">
        {/* Icon Container */}
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-slate-100">
          <Icon name={icon} size={22} color={iconColor || '#64748B'} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2">
              {label}
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-tight mb-1">
              {value}
            </div>
            {subtitle && (
              <div className="text-xs text-slate-400 mt-1 font-medium">
                {subtitle}
              </div>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1.5 mt-auto pt-2">
              <Icon
                name={trend.direction === 'up' ? 'trendingUp' : 'trendingDown'}
                size={14}
                color={trend.direction === 'up' ? '#4CC38A' : '#E74C3C'}
              />
              <span
                className={cn(
                  'text-xs font-bold',
                  trend.direction === 'up' ? 'text-[#4CC38A]' : 'text-[#E74C3C]'
                )}
              >
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-xs text-slate-400 font-medium">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

