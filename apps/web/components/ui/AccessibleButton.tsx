'use client';

import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  visuallyHiddenText?: string; // For icon-only buttons
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaHaspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  ariaLive?: 'polite' | 'assertive' | 'off';
  tooltipText?: string;
}

/**
 * Accessible button component that follows WCAG 2.1 AA guidelines
 * - Ensures proper ARIA attributes
 * - Provides loading states with announcements
 * - Maintains minimum touch target size (44x44px)
 * - Includes visible focus indicators
 */
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText = 'Loading...',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      visuallyHiddenText,
      ariaLabel,
      ariaDescribedBy,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ariaHaspopup,
      ariaLive,
      tooltipText,
      disabled,
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    // Generate unique ID for aria-describedby if needed
    const descriptionId = React.useId();
    const hasDescription = ariaDescribedBy || tooltipText;

    // Determine if button has visible text
    const hasVisibleText = React.Children.count(children) > 0;

    // Create appropriate aria-label
    const computedAriaLabel = ariaLabel ||
      (visuallyHiddenText && !hasVisibleText ? visuallyHiddenText : undefined);

    // Handle click with loading state
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    // Base styles for all buttons
    const baseStyles = cn(
      // Base styles
      'inline-flex items-center justify-center',
      'font-medium rounded-md',
      'transition-all duration-200',
      'relative overflow-hidden',

      // Focus styles (WCAG 2.4.7)
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'focus-visible:ring-[#0066CC]',

      // Disabled styles
      'disabled:opacity-60 disabled:cursor-not-allowed',

      // Loading styles
      loading && 'cursor-wait',

      // Full width
      fullWidth && 'w-full',

      // Minimum touch target size (WCAG 2.5.5)
      'min-h-[44px] min-w-[44px]'
    );

    // Variant styles
    const variantStyles = {
      primary: cn(
        'bg-[#0066CC] text-white',
        'hover:bg-[#0052A3] active:bg-[#00428A]',
        'focus-visible:ring-[#0066CC]'
      ),
      secondary: cn(
        'bg-white text-gray-700 border border-gray-300',
        'hover:bg-gray-50 active:bg-gray-100',
        'focus-visible:ring-gray-500'
      ),
      danger: cn(
        'bg-red-600 text-white',
        'hover:bg-red-700 active:bg-red-800',
        'focus-visible:ring-red-600'
      ),
      ghost: cn(
        'bg-transparent text-gray-700',
        'hover:bg-gray-100 active:bg-gray-200',
        'focus-visible:ring-gray-500'
      ),
      link: cn(
        'bg-transparent text-[#0066CC] underline-offset-4',
        'hover:underline active:text-[#00428A]',
        'focus-visible:ring-[#0066CC]',
        'p-0 min-h-[auto] min-w-[auto]'
      ),
    };

    // Size styles
    const sizeStyles = {
      sm: cn('text-sm px-3 py-1.5', variant === 'link' && 'px-0 py-0'),
      md: cn('text-base px-4 py-2', variant === 'link' && 'px-0 py-0'),
      lg: cn('text-lg px-6 py-3', variant === 'link' && 'px-0 py-0'),
    };

    // Icon styles
    const iconStyles = cn(
      'flex-shrink-0',
      size === 'sm' && 'w-4 h-4',
      size === 'md' && 'w-5 h-5',
      size === 'lg' && 'w-6 h-6'
    );

    // Combine all styles
    const buttonStyles = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    return (
      <>
        <button
          ref={ref}
          type={type}
          className={buttonStyles}
          disabled={disabled || loading}
          onClick={handleClick}
          aria-label={computedAriaLabel}
          aria-describedby={hasDescription ? descriptionId : undefined}
          aria-pressed={ariaPressed}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          aria-haspopup={ariaHaspopup}
          aria-live={ariaLive}
          aria-busy={loading}
          aria-disabled={disabled || loading}
          {...props}
        >
          {/* Loading spinner */}
          {loading && (
            <Loader2
              className={cn(
                iconStyles,
                'animate-spin',
                children && 'mr-2'
              )}
              aria-hidden="true"
            />
          )}

          {/* Left icon */}
          {!loading && icon && iconPosition === 'left' && (
            <span
              className={cn(iconStyles, children && 'mr-2')}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          {/* Button text */}
          {loading ? (
            <span>{loadingText}</span>
          ) : (
            <>
              {children}
              {/* Visually hidden text for icon-only buttons */}
              {visuallyHiddenText && !hasVisibleText && (
                <span className="sr-only">{visuallyHiddenText}</span>
              )}
            </>
          )}

          {/* Right icon */}
          {!loading && icon && iconPosition === 'right' && (
            <span
              className={cn(iconStyles, children && 'ml-2')}
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
        </button>

        {/* Hidden description for screen readers */}
        {hasDescription && (
          <span
            id={descriptionId}
            className="sr-only"
            role="tooltip"
          >
            {tooltipText || ariaDescribedBy}
          </span>
        )}
      </>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

/**
 * Icon button variant with proper accessibility
 */
export const IconButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ children, ariaLabel, visuallyHiddenText, ...props }, ref) => {
    if (!ariaLabel && !visuallyHiddenText) {
      console.warn('IconButton: Must provide either ariaLabel or visuallyHiddenText for accessibility');
    }

    return (
      <AccessibleButton
        ref={ref}
        ariaLabel={ariaLabel}
        visuallyHiddenText={visuallyHiddenText}
        className={cn(
          'p-2',
          props.className
        )}
        {...props}
      >
        {children}
      </AccessibleButton>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * Button group for related actions
 */
export function ButtonGroup({
  children,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex space-x-2', className)}
    >
      {children}
    </div>
  );
}

export default AccessibleButton;