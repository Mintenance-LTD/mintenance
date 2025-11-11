/**
 * Button Component - Compatibility Wrapper
 * 
 * Wraps the shared Button component to maintain backward compatibility
 * with existing web app code while migrating to shared components.
 * 
 * This wrapper will be removed once all files are migrated.
 */

'use client';

import React from 'react';
import { Button as SharedButton } from '@mintenance/shared-ui';
import type { WebButtonProps } from '@mintenance/shared-ui';
import { getGradient } from '@/lib/theme-enhancements';
import { cn } from '@/lib/utils';

// Extend shared Button props for backward compatibility
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'destructive' // Maps to 'danger'
  | 'success'
  | 'gradient-primary' // Maps to 'primary' with gradient style
  | 'gradient-success'; // Maps to 'success' with gradient style

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<WebButtonProps, 'variant'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Compatibility wrapper for Button component
 * 
 * Maps old variant names to new shared component variants
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  style,
  ...props
}: ButtonProps) {
  // Map old variants to new variants (only return variants supported by shared Button)
  const mapVariant = (oldVariant?: ButtonVariant): 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' => {
    if (!oldVariant) return 'primary';
    switch (oldVariant) {
      case 'destructive':
        return 'danger';
      case 'gradient-primary':
        return 'primary'; // Use primary variant, gradient applied via style
      case 'gradient-success':
        return 'success'; // Use success variant, gradient applied via style
      case 'primary':
      case 'secondary':
      case 'outline':
      case 'ghost':
      case 'danger':
      case 'success':
        return oldVariant;
      default:
        return 'primary'; // Fallback
    }
  };

  const mappedVariant = mapVariant(variant);
  const isGradient = variant === 'gradient-primary' || variant === 'gradient-success';

  // Apply gradient style if needed
  const gradientStyle: React.CSSProperties = isGradient
    ? {
        background: getGradient(variant === 'gradient-primary' ? 'primary' : 'success'),
        backgroundColor: 'transparent', // Override solid background
      }
    : {};

  return (
    <SharedButton
      {...(props as any)}
      variant={mappedVariant as any}
      size={size}
      loading={loading}
      fullWidth={fullWidth}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      className={cn(className)}
      style={{
        ...gradientStyle,
        ...style,
      }}
    />
  );
}

export default Button;
