/**
 * Skeleton Component
 *
 * Modern skeleton loader with shimmer effect for improved perceived performance.
 * Research shows skeleton loaders make waiting feel shorter and keep users engaged.
 *
 * Features:
 * - Smooth shimmer animation
 * - Dark mode support
 * - Respects prefers-reduced-motion
 * - Configurable dimensions and border radius
 * - WCAG 2.1 AA compliant
 *
 * @example
 * // Basic skeleton
 * <Skeleton className="h-4 w-full" />
 *
 * // Circle skeleton
 * <Skeleton className="h-12 w-12 rounded-full" />
 *
 * // Custom styling
 * <Skeleton className="h-20 w-full rounded-xl" />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the shimmer animation is enabled
   * @default true
   */
  animate?: boolean;

  /**
   * The variant of the skeleton
   * @default 'default'
   */
  variant?: 'default' | 'text' | 'circular' | 'rectangular';

  /**
   * Width of the skeleton
   * Can be any valid CSS width value
   */
  width?: string | number;

  /**
   * Height of the skeleton
   * Can be any valid CSS height value
   */
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, variant = 'default', width, height, style, ...props }, ref) => {
    const variantStyles = {
      default: '',
      text: 'h-4 rounded-md',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    const combinedStyle: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden bg-gray-200 dark:bg-gray-800',

          // Shimmer effect (only if animate is true)
          animate && [
            'before:absolute before:inset-0',
            'before:-translate-x-full',
            'before:animate-[shimmer_1.5s_ease-in-out_infinite]',
            'before:bg-gradient-to-r',
            'before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent',
          ],

          // Respect reduced motion preference
          'motion-reduce:before:animate-none',

          // Variant styles
          variantStyles[variant],

          className
        )}
        style={combinedStyle}
        aria-busy="true"
        aria-live="polite"
        role="status"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * Container for multiple skeleton elements with consistent spacing
 */
export const SkeletonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { gap?: 'sm' | 'md' | 'lg' }
>(({ className, gap = 'md', children, ...props }, ref) => {
  const gapClasses = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  };

  return (
    <div ref={ref} className={cn(gapClasses[gap], className)} {...props}>
      {children}
    </div>
  );
});

SkeletonGroup.displayName = 'SkeletonGroup';

/**
 * Pre-built skeleton for text content with automatic width variation
 */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'variant'> {
  lines?: number;
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, className, ...props }, ref) => {
    return (
      <SkeletonGroup ref={ref} gap="sm" className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={index === lines - 1 ? '80%' : '100%'}
            {...props}
          />
        ))}
      </SkeletonGroup>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

/**
 * Pre-built skeleton for avatar/profile pictures
 */
export interface SkeletonAvatarProps extends Omit<SkeletonProps, 'variant'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    };

    return (
      <Skeleton
        ref={ref}
        variant="circular"
        className={cn(sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

/**
 * Pre-built skeleton for buttons
 */
export interface SkeletonButtonProps extends Omit<SkeletonProps, 'variant'> {
  size?: 'sm' | 'md' | 'lg';
}

export const SkeletonButton = React.forwardRef<HTMLDivElement, SkeletonButtonProps>(
  ({ size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-9 w-20',
      md: 'h-10 w-24',
      lg: 'h-12 w-32',
    };

    return (
      <Skeleton
        ref={ref}
        variant="rectangular"
        className={cn(sizeClasses[size], 'rounded-lg', className)}
        {...props}
      />
    );
  }
);

SkeletonButton.displayName = 'SkeletonButton';

/**
 * Pre-built skeleton for badges
 */
export const SkeletonBadge = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Skeleton
        ref={ref}
        className={cn('h-6 w-16 rounded-full', className)}
        {...props}
      />
    );
  }
);

SkeletonBadge.displayName = 'SkeletonBadge';

/**
 * Pre-built skeleton for images
 */
export interface SkeletonImageProps extends Omit<SkeletonProps, 'variant'> {
  aspectRatio?: 'square' | 'video' | 'photo';
}

export const SkeletonImage = React.forwardRef<HTMLDivElement, SkeletonImageProps>(
  ({ aspectRatio = 'photo', className, ...props }, ref) => {
    const aspectClasses = {
      square: 'aspect-square',
      video: 'aspect-video',
      photo: 'aspect-[4/3]',
    };

    return (
      <Skeleton
        ref={ref}
        variant="rectangular"
        className={cn(aspectClasses[aspectRatio], 'w-full', className)}
        {...props}
      />
    );
  }
);

SkeletonImage.displayName = 'SkeletonImage';

export default Skeleton;
