'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export interface StandardCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
}

/**
 * StandardCard - Standardized card component for consistent styling
 * 
 * Follows design system:
 * - Padding: 24px (p-6) by default
 * - Border radius: 12px (rounded-xl)
 * - Shadow: shadow-sm
 * - Border: 1px solid border-gray-200
 * - Hover: lift effect with enhanced shadow
 */
export function StandardCard({
  children,
  className,
  hover = false,
  onClick,
  padding = 'md',
  variant = 'default',
}: StandardCardProps) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6', // 24px - standard per plan
    lg: 'p-8',
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-200 shadow-lg',
    outlined: 'bg-transparent border-2 border-gray-200 shadow-none',
  };

  const hoverClasses = hover || onClick
    ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'
    : '';

  return (
    <div
      className={cn(
        'rounded-xl', // 12px border radius
        paddingClasses[padding],
        variantClasses[variant],
        hoverClasses,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}

