'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { contractorTheme, getTransitionClasses, formatCurrency } from '@/lib/design-system/contractor-theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  isCurrency?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

/**
 * MetricCard - Clean KPI/metric card component
 * Airbnb-inspired minimal design with professional appearance
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  isCurrency = false,
  subtitle,
  onClick,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return TrendingUp;
    if (trend.direction === 'down') return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'up') return 'text-green-600 bg-green-50';
    if (trend.direction === 'down') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const TrendIcon = getTrendIcon();
  const displayValue = isCurrency && typeof value === 'number' ? formatCurrency(value) : value;

  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-xl p-6
        hover:shadow-md hover:border-gray-300
        ${getTransitionClasses()}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={{
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
      onClick={onClick}
    >
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        {trend && TrendIcon && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${getTrendColor()}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-sm text-gray-600 mb-1">{title}</p>

      {/* Value */}
      <p className="text-2xl font-semibold text-gray-900 mb-1">{displayValue}</p>

      {/* Subtitle or trend label */}
      {(subtitle || trend?.label) && (
        <p className="text-xs text-gray-500">{subtitle || trend?.label}</p>
      )}
    </div>
  );
}

interface CompactMetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  isCurrency?: boolean;
  className?: string;
}

/**
 * CompactMetricCard - Smaller version for dense layouts
 */
export function CompactMetricCard({
  label,
  value,
  icon: Icon,
  isCurrency = false,
  className = '',
}: CompactMetricCardProps) {
  const displayValue = isCurrency && typeof value === 'number' ? formatCurrency(value) : value;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Icon && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-base font-semibold text-gray-900 truncate">{displayValue}</p>
      </div>
    </div>
  );
}
