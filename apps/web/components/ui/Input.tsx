'use client';

import React, { forwardRef, useState } from 'react';
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
}

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
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasError] = useState(!!errorText);

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

    return (
      <div className={`input-container ${containerClassName}`} style={containerStyles}>
        {label && (
          <label style={labelStyles}>
            {label}
            {required && <span style={{ color: theme.colors.error }}> *</span>}
          </label>
        )}

        <div style={inputWrapperStyles}>
          {leftIcon && (
            <div style={leftIconStyles}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={`input ${className}`}
            style={{
              ...inputStyles,
              ...(isFocused ? focusStyles : {}),
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-invalid={hasError}
            aria-describedby={
              (errorText || helperText) ? `${props.id || 'input'}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div
              style={rightIconStyles}
              onClick={onRightIconClick}
              role={onRightIconClick ? 'button' : undefined}
              tabIndex={onRightIconClick ? 0 : undefined}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {(errorText || helperText) && (
          <div
            id={`${props.id || 'input'}-helper`}
            style={helperTextStyles}
          >
            {errorText || helperText}
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
        `}</style>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;