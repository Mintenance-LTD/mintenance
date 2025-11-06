'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { getGradientCardStyle, getCardHoverStyle } from '@/lib/theme-enhancements';

export type GradientVariant = 'primary' | 'success' | 'warning' | 'info' | 'subtle';

export interface GradientCardProps {
  children: React.ReactNode;
  variant?: GradientVariant;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * GradientCard Component
 * 
 * A card component with gradient background and enhanced hover effects.
 * Perfect for metric cards, feature highlights, and visual emphasis.
 * 
 * @example
 * <GradientCard variant="primary" hover>
 *   <h3>Total Revenue</h3>
 *   <p>£15,000</p>
 * </GradientCard>
 */
export function GradientCard({
  children,
  variant = 'subtle',
  hover = false,
  onClick,
  className = '',
  style = {},
  padding = 'lg',
}: GradientCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const paddingValues: Record<typeof padding, string> = {
    none: '0',
    sm: theme.spacing[4],
    md: theme.spacing[6],
    lg: theme.spacing[8],
  };

  const baseStyle = getGradientCardStyle(variant);
  const hoverStyle = (hover || onClick) && isHovered ? getCardHoverStyle() : {};

  return (
    <div
      className={`gradient-card ${className}`}
      style={{
        ...baseStyle,
        padding: paddingValues[padding],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...hoverStyle,
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

export default GradientCard;

