/**
 * Input Component - Web Implementation
 * 
 * Web-specific Input component using design tokens
 */

'use client';

import React, { useState } from 'react';
import { webTokens } from '@mintenance/design-tokens';
import { cn } from '../../utils/cn';
import type { WebInputProps, InputSize } from './types';

/**
 * Input Component for Web
 * 
 * Uses design tokens for consistent styling across platforms
 */
export function Input({
  value,
  defaultValue,
  placeholder,
  type = 'text',
  size = 'md',
  disabled = false,
  readOnly = false,
  required = false,
  autoFocus = false,
  autoComplete,
  label,
  helperText,
  errorText,
  successText,
  leftIcon,
  rightIcon,
  error = false,
  success = false,
  onChange,
  onBlur,
  onFocus,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  style,
  ...props
}: WebInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = error || !!errorText;
  const hasSuccess = success || !!successText;
  const showHelperText = helperText || errorText || successText;

  // Size styles
  const sizeStyles: Record<InputSize, React.CSSProperties> = {
    sm: {
      padding: `${webTokens.spacing.sm}px ${webTokens.spacing.md}px`,
      fontSize: webTokens.typography.fontSize.sm,
      minHeight: '32px',
    },
    md: {
      padding: `${webTokens.spacing.md}px ${webTokens.spacing.lg}px`,
      fontSize: webTokens.typography.fontSize.base,
      minHeight: '40px',
    },
    lg: {
      padding: `${webTokens.spacing.lg}px ${webTokens.spacing.xl}px`,
      fontSize: webTokens.typography.fontSize.base,
      minHeight: '48px',
    },
  };

  // Base border color
  const baseBorderColor = hasError 
    ? webTokens.colors.error 
    : hasSuccess 
    ? webTokens.colors.success 
    : webTokens.colors.border;

  // Base styles - using separate border properties instead of shorthand
  const baseStyles: React.CSSProperties = {
    width: '100%',
    borderRadius: webTokens.borderRadius.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: baseBorderColor,
    backgroundColor: disabled ? webTokens.colors.gray100 : webTokens.colors.white,
    color: webTokens.colors.textPrimary,
    outline: 'none',
    transition: 'all 0.2s ease',
    ...sizeStyles[size],
  };

  // Focus styles
  const focusStyles: React.CSSProperties = isFocused && !disabled
    ? {
        borderColor: hasError ? webTokens.colors.error : hasSuccess ? webTokens.colors.success : webTokens.colors.primary,
        boxShadow: `0 0 0 3px ${hasError ? webTokens.colors.error + '20' : hasSuccess ? webTokens.colors.success + '20' : webTokens.colors.primary + '20'}`,
      }
    : {};

  // Normalize style prop to avoid mixing shorthand and non-shorthand border properties
  // Remove all border-related properties from incoming style since we use separate border properties
  const normalizedStyle: React.CSSProperties = style ? { ...style } : {};
  
  // Remove all border-related shorthand and non-shorthand properties to avoid conflicts
  const borderProperties = ['border', 'borderWidth', 'borderStyle', 'borderColor', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
  borderProperties.forEach(prop => {
    if (prop in normalizedStyle) {
      delete normalizedStyle[prop as keyof React.CSSProperties];
    }
  });

  const inputStyles: React.CSSProperties = {
    ...baseStyles,
    ...focusStyles,
    ...normalizedStyle,
  };

  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const helperTextId = showHelperText ? `${inputId}-helper` : undefined;

  return (
    <div className={cn('input-wrapper', className)} style={{ width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontSize: webTokens.typography.fontSize.sm,
            fontWeight: webTokens.typography.fontWeight.semibold,
            color: webTokens.colors.textPrimary,
            marginBottom: webTokens.spacing.sm,
          }}
        >
          {label}
          {required && (
            <span style={{ color: webTokens.colors.error, marginLeft: webTokens.spacing.xs }}>
              *
            </span>
          )}
        </label>
      )}

      <div style={{ position: 'relative', width: '100%' }}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: webTokens.spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: webTokens.colors.textSecondary,
            }}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          {...props}
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          onChange={onChange}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          className={cn('input', hasError && 'input-error', hasSuccess && 'input-success')}
            style={{
              ...inputStyles,
              paddingLeft: leftIcon ? `${Number(webTokens.spacing.xl) * 2}px` : inputStyles.paddingLeft,
              paddingRight: rightIcon ? `${Number(webTokens.spacing.xl) * 2}px` : inputStyles.paddingRight,
            }}
          aria-label={ariaLabel || label}
          aria-describedby={helperTextId || ariaDescribedby}
          aria-invalid={ariaInvalid !== undefined ? ariaInvalid : hasError}
        />

        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: webTokens.spacing.md,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: hasError ? webTokens.colors.error : hasSuccess ? webTokens.colors.success : webTokens.colors.textSecondary,
            }}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>

      {showHelperText && (
        <p
          id={helperTextId}
          style={{
            margin: 0,
            marginTop: webTokens.spacing.xs,
            fontSize: webTokens.typography.fontSize.xs,
            color: errorText ? webTokens.colors.error : successText ? webTokens.colors.success : webTokens.colors.textSecondary,
          }}
        >
          {errorText || successText || helperText}
        </p>
      )}
    </div>
  );
}

export default Input;

