'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Standardized Admin Card Component
 * Matches the dashboard design system:
 * - rounded-[16px]
 * - border border-slate-200
 * - bg-white
 * - shadow-[0_8px_24px_rgba(0,0,0,0.06)]
 * - hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]
 */
export function AdminCard({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  style,
}: AdminCardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300',
        paddingClasses[padding],
        hover || onClick ? 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : '',
        onClick ? 'cursor-pointer' : '',
        className
      )}
      style={{
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

