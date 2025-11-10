/**
 * Button Component - Web Implementation
 * 
 * Web-specific Button component using design tokens
 */

'use client';

import React, { useState, useEffect } from 'react';
import { webTokens } from '@mintenance/design-tokens';
import { cn } from '../../utils/cn';
import type { WebButtonProps, ButtonSize } from './types';

/**
 * Button Component for Web
 * 
 * Uses design tokens for consistent styling across platforms
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
  onClick,
  ...props
}: WebButtonProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure hydration matches by only applying interactive styles after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDisabled = disabled || loading;

  // Base styles using design tokens
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontWeight: webTokens.typography.fontWeight.semibold,
    borderRadius: webTokens.borderRadius.lg,
    border: 'none',
    width: fullWidth ? '100%' : 'auto',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
  };

  // Size styles
  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: {
      padding: `${webTokens.spacing.sm} ${webTokens.spacing.md}`,
      fontSize: webTokens.typography.fontSize.sm,
      minHeight: '32px',
    },
    md: {
      padding: `${webTokens.spacing.md} ${webTokens.spacing.lg}`,
      fontSize: webTokens.typography.fontSize.sm,
      minHeight: '40px',
    },
    lg: {
      padding: `${webTokens.spacing.lg} ${webTokens.spacing.xl}`,
      fontSize: webTokens.typography.fontSize.sm,
      minHeight: '48px',
    },
    xl: {
      padding: `${webTokens.spacing.xl} ${webTokens.spacing['2xl']}`,
      fontSize: webTokens.typography.fontSize.base,
      minHeight: '56px',
    },
  };

  // Variant styles
  const getVariantStyles = (): React.CSSProperties => {
    const base = {
      // Only apply transform after mount to prevent hydration mismatch
      transform: mounted && isPressed && !isDisabled ? 'scale(0.98)' : 'scale(1)',
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: isDisabled ? webTokens.colors.gray400 : webTokens.colors.primary,
          color: webTokens.colors.white,
          boxShadow: isDisabled ? 'none' : webTokens.shadows.sm,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: isDisabled ? webTokens.colors.gray200 : webTokens.colors.secondary,
          color: webTokens.colors.white,
          boxShadow: isDisabled ? 'none' : webTokens.shadows.sm,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          border: `2px solid ${isDisabled ? webTokens.colors.gray300 : webTokens.colors.primary}`,
          color: isDisabled ? webTokens.colors.gray500 : webTokens.colors.primary,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          color: isDisabled ? webTokens.colors.gray500 : webTokens.colors.textPrimary,
        };
      case 'danger':
        return {
          ...base,
          backgroundColor: isDisabled ? webTokens.colors.gray400 : webTokens.colors.error,
          color: webTokens.colors.white,
          boxShadow: isDisabled ? 'none' : webTokens.shadows.sm,
        };
      case 'success':
        return {
          ...base,
          backgroundColor: isDisabled ? webTokens.colors.gray400 : webTokens.colors.success,
          color: webTokens.colors.white,
          boxShadow: isDisabled ? 'none' : webTokens.shadows.sm,
        };
      default:
        return base;
    }
  };

  // Focus styles
  const focusStyles: React.CSSProperties = mounted && isFocused && !isDisabled
    ? {
        outline: `3px solid ${webTokens.colors.primary}`,
        outlineOffset: '4px',
      }
    : {};

  // Determine effective ARIA attributes
  const effectiveAriaLabel = ariaLabel || (typeof children === 'string' ? children : undefined);
  const effectiveAriaBusy = ariaBusy !== undefined ? ariaBusy : loading;
  const effectiveAriaDisabled = ariaDisabled !== undefined ? ariaDisabled : isDisabled;

  const buttonStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...getVariantStyles(),
    ...focusStyles,
    ...props.style,
  };

  return (
    <button
      {...props}
      type={type}
      className={cn('button', className)}
      style={buttonStyles}
      disabled={isDisabled}
      aria-label={effectiveAriaLabel}
      aria-busy={effectiveAriaBusy}
      aria-disabled={effectiveAriaDisabled}
      aria-live={loading ? 'polite' : undefined}
      onClick={onClick}
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
      onKeyDown={(e) => {
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
        <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: webTokens.spacing.sm }} aria-hidden="true">
          {leftIcon}
        </span>
      )}

      {/* Loading Spinner */}
      {loading && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', marginRight: webTokens.spacing.sm }}
          role="status"
          aria-label="Loading"
        >
          <svg
            style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}
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
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: webTokens.spacing.sm }} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
}

