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
        'rounded-2xl border border-slate-100 bg-white p-4 h-28 transition-all duration-300 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
        styles.metricCard,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 h-full">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <Icon name={icon} size={18} color={iconColor || '#64748B'} className="text-slate-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="text-xl font-semibold text-slate-900 mt-1 truncate">
            {value}
          </div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
          {trend && (
            <div className="flex items-center gap-1.5 mt-1">
              <Icon
                name={trend.direction === 'up' ? 'trendingUp' : 'trendingDown'}
                size={14}
                color={trend.direction === 'up' ? '#10B981' : '#EF4444'}
              />
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {trend.value}
              </span>
              {trend.label && <span className="text-xs text-slate-400">{trend.label}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

