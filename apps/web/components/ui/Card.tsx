/**
 * Card Component - Compatibility Wrapper
 * 
 * Wraps the shared Card component to maintain backward compatibility
 * with existing web app code while migrating to shared components.
 * 
 * This wrapper will be removed once all files are migrated.
 */

'use client';

import React from 'react';
import { 
  Card as SharedCard, 
  CardHeader as SharedCardHeader, 
  CardFooter as SharedCardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@mintenance/shared-ui';
import type { WebCardProps } from '@mintenance/shared-ui';
import { getGradientCardStyle } from '@/lib/theme-enhancements';
import { cn } from '@/lib/utils';

// Extend shared Card props for backward compatibility
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'highlighted' | 'bordered' | 'gradient-primary' | 'gradient-success' | 'gradient-warning';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<WebCardProps, 'variant' | 'padding'> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Compatibility wrapper for Card component
 * 
 * Maps old variant names to new shared component variants
 */
function CardComponent({
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
  className = '',
  style,
  ...props
}: CardProps) {
  // Map old variants to new variants
  const mapVariant = (oldVariant?: CardVariant): WebCardProps['variant'] => {
    if (!oldVariant) return 'default';
    switch (oldVariant) {
      case 'highlighted':
      case 'bordered':
        return 'outlined'; // Map to outlined variant
      case 'gradient-primary':
      case 'gradient-success':
      case 'gradient-warning':
        return 'default'; // Use default variant, gradient applied via style
      default:
        return oldVariant;
    }
  };

  const mappedVariant = mapVariant(variant);
  const isGradient = variant === 'gradient-primary' || variant === 'gradient-success' || variant === 'gradient-warning';
  const isHighlighted = variant === 'highlighted';

  // Apply gradient or highlighted style if needed
  const customStyle: React.CSSProperties = isGradient
    ? {
        ...getGradientCardStyle(
          variant === 'gradient-primary' ? 'primary' :
          variant === 'gradient-success' ? 'success' : 'warning'
        ),
      }
    : isHighlighted
    ? {
        backgroundColor: '#0F172A', // primary color
        color: '#FFFFFF',
        border: '1px solid #0F172A',
      }
    : {};

  return (
    <SharedCard
      {...(props as any)}
      variant={mappedVariant as any}
      padding={padding}
      hover={hover}
      onClick={onClick}
      className={cn(className)}
      style={{
        ...customStyle,
        ...style,
      }}
    />
  );
}

// Named export
export const Card = CardComponent;

// Re-export sub-components
export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@mintenance/shared-ui';

// For backward compatibility with Card.Header, Card.Title, etc.
Card.Header = SharedCardHeader;
Card.Footer = SharedCardFooter;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;

// Default export
export default Card;
