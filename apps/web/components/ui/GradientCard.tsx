'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * GradientCard - A reusable white box component with gradient hover effect
 * 
 * Features:
 * - White background with rounded corners
 * - Border and shadow styling
 * - Gradient bar that appears on hover (always visible on large screens)
 * - Smooth hover animations (lift effect and shadow increase)
 * 
 * Usage:
 * <GradientCard>
 *   <h2>Card Title</h2>
 *   <p>Card content</p>
 * </GradientCard>
 */
export function GradientCard({ 
  children, 
  className = '', 
  padding = 'md',
  onClick 
}: GradientCardProps) {
  const paddingClass = paddingMap[padding];
  
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200 shadow-sm',
        'hover:shadow-lg hover:-translate-y-0.5',
        'transition-all duration-200',
        'group relative overflow-hidden',
        paddingClass,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Gradient bar - appears on hover, always visible on large screens */}
      <div 
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"
        data-gradient-bar="true"
        aria-hidden="true"
      />
      {/* Content */}
      {children}
    </div>
  );
}
