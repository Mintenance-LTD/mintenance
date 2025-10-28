'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  // Accessibility props
  'aria-label'?: string;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
}

/**
 * Enhanced Button Component with Full Accessibility Support
 *
 * Features:
 * - 6 variants (primary, secondary, outline, ghost, danger, success)
 * - 4 sizes (sm, md, lg, xl)
 * - Loading states with proper ARIA announcements
 * - Left/right icon support
 * - Full keyboard navigation
 * - WCAG AA compliant (44px min touch target)
 * - Focus visible states
 * - Proper disabled handling
 *
 * @example
 * <Button variant="primary" size="md" loading>Submit</Button>
 * <Button variant="outline" leftIcon={<Icon />}>Cancel</Button>
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  'aria-label': ariaLabel,
  'aria-busy': ariaBusy,
  'aria-disabled': ariaDisabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Compute base styles
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: theme.typography.fontFamily.regular,
    fontWeight: theme.typography.fontWeight.semibold,
    borderRadius: theme.borderRadius.xl,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    position: 'relative',
    minWidth: fullWidth ? '100%' : undefined,
    width: fullWidth ? '100%' : undefined,
    // WCAG AA minimum touch target
    minHeight: '44px',
  };

  // Size-specific styles
  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
      fontSize: theme.typography.fontSize.sm,
      minHeight: '32px',
    },
    md: {
      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      fontSize: theme.typography.fontSize.base,
      minHeight: '40px',
    },
    lg: {
      padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
      fontSize: theme.typography.fontSize.lg,
      minHeight: '48px',
    },
    xl: {
      padding: `${theme.spacing[4]} ${theme.spacing[8]}`,
      fontSize: theme.typography.fontSize.xl,
      minHeight: '56px',
    },
  };

  // Variant-specific styles
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled || loading ? theme.colors.borderDark : theme.colors.primary,
      color: theme.colors.textInverse,
      boxShadow: disabled || loading ? 'none' : theme.shadows.base,
    },
    secondary: {
      backgroundColor: disabled || loading ? theme.colors.backgroundSecondary : theme.colors.secondary,
      color: theme.colors.textInverse,
      boxShadow: disabled || loading ? 'none' : theme.shadows.sm,
    },
    outline: {
      backgroundColor: 'transparent',
      color: disabled || loading ? theme.colors.textTertiary : theme.colors.primary,
      border: `2px solid ${disabled || loading ? theme.colors.border : theme.colors.primary}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: disabled || loading ? theme.colors.textTertiary : theme.colors.textPrimary,
    },
    danger: {
      backgroundColor: disabled || loading ? theme.colors.borderDark : theme.colors.error,
      color: theme.colors.textInverse,
      boxShadow: disabled || loading ? 'none' : theme.shadows.base,
    },
    success: {
      backgroundColor: disabled || loading ? theme.colors.borderDark : theme.colors.success,
      color: theme.colors.textInverse,
      boxShadow: disabled || loading ? 'none' : theme.shadows.base,
    },
  };

  // Hover styles (only when not disabled/loading)
  const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: theme.colors.primaryLight,
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.lg,
    },
    secondary: {
      backgroundColor: theme.colors.secondaryDark,
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.md,
    },
    outline: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderColor: theme.colors.primaryLight,
    },
    ghost: {
      backgroundColor: theme.colors.backgroundSecondary,
    },
    danger: {
      backgroundColor: theme.colors.errorDark,
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.lg,
    },
    success: {
      backgroundColor: theme.colors.successDark,
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows.lg,
    },
  };

  // Focus styles for accessibility
  const focusStyles: React.CSSProperties = isFocused
    ? {
        outline: `3px solid ${theme.colors.primary}`,
        outlineOffset: '2px',
      }
    : {};

  // Active/pressed styles
  const activeStyles: React.CSSProperties = isPressed && !disabled && !loading
    ? {
        transform: 'translateY(0) scale(0.98)',
      }
    : {};

  // Combine all styles
  const buttonStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...focusStyles,
    ...activeStyles,
  };

  // Determine effective ARIA attributes
  const isDisabled = disabled || loading;
  const effectiveAriaLabel = ariaLabel || (typeof children === 'string' ? children : undefined);
  const effectiveAriaBusy = ariaBusy !== undefined ? ariaBusy : loading;
  const effectiveAriaDisabled = ariaDisabled !== undefined ? ariaDisabled : isDisabled;

  return (
    <button
      {...props}
      type={type}
      className={className}
      style={buttonStyles}
      disabled={isDisabled}
      aria-label={effectiveAriaLabel}
      aria-busy={effectiveAriaBusy}
      aria-disabled={effectiveAriaDisabled}
      aria-live={loading ? 'polite' : undefined}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
      onMouseDown={(e) => {
        setIsPressed(true);
        props.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setIsPressed(false);
        props.onMouseUp?.(e);
      }}
      onMouseLeave={(e) => {
        setIsPressed(false);
        props.onMouseLeave?.(e);
      }}
      onMouseEnter={(e) => {
        if (!isDisabled && props.onMouseEnter) {
          props.onMouseEnter(e);
        }
      }}
      onKeyDown={(e) => {
        // Enhanced keyboard support
        if (e.key === 'Enter' || e.key === ' ') {
          setIsPressed(true);
        }
        props.onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setIsPressed(false);
        }
        props.onKeyUp?.(e);
      }}
    >
      {/* Left Icon */}
      {leftIcon && !loading && (
        <span
          style={{
            display: 'inline-flex',
            marginRight: theme.spacing[2],
            alignItems: 'center',
          }}
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}

      {/* Loading Spinner */}
      {loading && (
        <span
          style={{
            display: 'inline-flex',
            marginRight: theme.spacing[2],
            alignItems: 'center',
          }}
          role="status"
          aria-label="Loading"
        >
          <svg
            style={{
              width: '1rem',
              height: '1rem',
              animation: 'spin 1s linear infinite',
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}

      {/* Button Text */}
      <span>{children}</span>

      {/* Right Icon */}
      {rightIcon && !loading && (
        <span
          style={{
            display: 'inline-flex',
            marginLeft: theme.spacing[2],
            alignItems: 'center',
          }}
          aria-hidden="true"
        >
          {rightIcon}
        </span>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        button:hover:not(:disabled) {
          ${!disabled && !loading ? Object.entries(hoverStyles[variant])
            .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
            .join('\n          ') : ''}
        }

        button:focus-visible {
          outline: 3px solid ${theme.colors.primary};
          outline-offset: 2px;
        }
      `}</style>
    </button>
  );
}

export default Button;
