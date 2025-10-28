'use client';

import React, { forwardRef, useState, useId } from 'react';
import { theme } from '@/lib/theme';

type InputVariant = 'default' | 'focused' | 'error';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  variant?: InputVariant;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  required?: boolean;
  errorText?: string;
  helperText?: string;
  // Enhanced accessibility props
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * Enhanced Input Component with Full Accessibility Support
 *
 * Features:
 * - Proper label association with htmlFor
 * - ARIA attributes for error states
 * - Helper text support with aria-describedby
 * - Required field indicators
 * - Icon support with keyboard navigation
 * - Focus visible states
 * - Screen reader announcements
 *
 * @example
 * <Input label="Email" type="email" required errorText="Invalid email" />
 * <Input leftIcon={<SearchIcon />} placeholder="Search..." />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    containerClassName = '',
    containerStyle = {},
    className = '',
    style = {},
    variant: propVariant,
    label,
    leftIcon,
    rightIcon,
    onRightIconClick,
    size = 'md',
    fullWidth = false,
    required = false,
    errorText,
    helperText,
    onFocus,
    onBlur,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    id: providedId,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!errorText;

    // Generate unique IDs for accessibility
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const labelId = `${inputId}-label`;

    // Determine variant based on state
    const variant = propVariant || (hasError ? 'error' : (isFocused ? 'focused' : 'default'));
    const variantStyles = theme.components.input[variant];

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[1],
      width: fullWidth ? '100%' : 'auto',
      ...containerStyle,
    };

    const inputWrapperStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    };

    const inputStyles: React.CSSProperties = {
      width: '100%',
      minHeight: size === 'sm' ? theme.layout.minTouchTarget : theme.layout.inputHeightLarge,
      padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
      paddingLeft: leftIcon ? theme.spacing[10] : theme.spacing[3],
      paddingRight: rightIcon ? theme.spacing[10] : theme.spacing[3],

      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.regular,
      fontWeight: theme.typography.fontWeight.regular,
      lineHeight: theme.typography.lineHeight.normal,

      backgroundColor: variantStyles.backgroundColor,
      color: variantStyles.color || theme.colors.textPrimary,
      border: `1px solid ${variantStyles.borderColor}`,
      borderRadius: theme.borderRadius.lg,

      outline: 'none',
      transition: 'all 0.15s ease-in-out',

      ...style,
    };

    const focusStyles: React.CSSProperties = variant === 'focused' ? {
      borderColor: theme.components.input.focused.borderColor,
      boxShadow: theme.components.input.focused.boxShadow,
    } : {};

    const labelStyles: React.CSSProperties = {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: hasError ? theme.colors.error : theme.colors.textSecondary,
      marginBottom: theme.spacing[1],
      cursor: 'pointer', // Make it clear label is clickable
    };

    const iconStyles: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.colors.textTertiary,
      pointerEvents: 'none',
    };

    const leftIconStyles: React.CSSProperties = {
      ...iconStyles,
      left: theme.spacing[3],
    };

    const rightIconStyles: React.CSSProperties = {
      ...iconStyles,
      right: theme.spacing[3],
      pointerEvents: onRightIconClick ? 'auto' : 'none',
      cursor: onRightIconClick ? 'pointer' : 'default',
    };

    const helperTextStyles: React.CSSProperties = {
      fontSize: theme.typography.fontSize.sm,
      color: hasError ? theme.colors.error : theme.colors.textTertiary,
      marginTop: theme.spacing[1],
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (onFocus) {
        onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleRightIconKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && onRightIconClick) {
        e.preventDefault();
        onRightIconClick();
      }
    };

    // Build aria-describedby
    const ariaDescribedBy = [
      helperText && helperId,
      errorText && errorId,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`input-container ${containerClassName}`} style={containerStyles}>
        {label && (
          <label
            htmlFor={inputId}
            id={labelId}
            style={labelStyles}
          >
            {label}
            {required && (
              <span
                style={{ color: theme.colors.error }}
                aria-label="required"
              >
                {' '}*
              </span>
            )}
          </label>
        )}

        <div style={inputWrapperStyles}>
          {leftIcon && (
            <div
              style={leftIconStyles}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`input ${className}`}
            style={{
              ...inputStyles,
              ...(isFocused ? focusStyles : {}),
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required={required}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={ariaDescribedBy}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy || (label ? labelId : undefined)}
            {...props}
          />

          {rightIcon && (
            <div
              style={rightIconStyles}
              onClick={onRightIconClick}
              onKeyDown={handleRightIconKeyDown}
              role={onRightIconClick ? 'button' : undefined}
              tabIndex={onRightIconClick ? 0 : -1}
              aria-label={onRightIconClick ? 'Toggle' : undefined}
              aria-hidden={!onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {helperText && !errorText && (
          <div
            id={helperId}
            style={helperTextStyles}
            role="note"
          >
            {helperText}
          </div>
        )}

        {errorText && (
          <div
            id={errorId}
            style={helperTextStyles}
            role="alert"
            aria-live="assertive"
          >
            {errorText}
          </div>
        )}

        <style jsx>{`
          .input::placeholder {
            color: ${variantStyles.placeholderColor || theme.colors.placeholder};
          }

          .input:focus {
            border-color: ${theme.components.input.focused.borderColor};
            box-shadow: ${theme.components.input.focused.boxShadow};
          }

          .input:focus-visible {
            outline: 2px solid ${theme.colors.borderFocus};
            outline-offset: 2px;
          }

          .input:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background-color: ${theme.colors.backgroundSecondary};
          }
        `}</style>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
