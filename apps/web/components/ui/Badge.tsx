'use client';

import React from 'react';
import { designSystem } from '@/lib/design-system';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  style = {}
}: BadgeProps) {
  const baseStyle = designSystem.components.badge.base;
  const variantStyle = variant !== 'default' 
    ? designSystem.components.badge[variant] 
    : {};

  const sizeStyle = size === 'sm' 
    ? { padding: '0.125rem 0.5rem', fontSize: '0.625rem' }
    : {};

  return (
    <span 
      className={className}
      style={{
        ...baseStyle,
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
