'use client';

import React, { forwardRef, useState } from 'react';
import { theme } from '@/lib/theme';

type TextareaVariant = 'default' | 'focused' | 'error';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  variant?: TextareaVariant;
  label?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  required?: boolean;
  errorText?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    containerClassName = '',
    containerStyle = {},
    className = '',
    style = {},
    variant: propVariant,
    label,
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

    // Normalize style prop to avoid mixing shorthand and non-shorthand border properties
    // Remove all border-related properties from incoming style since we use separate border properties
    const borderProperties = ['border', 'borderWidth', 'borderStyle', 'borderColor', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
    const normalizedStyle: React.CSSProperties = { ...style };
    borderProperties.forEach(prop => {
      if (prop in normalizedStyle) {
        delete (normalizedStyle as any)[prop];
      }
    });

    const textareaStyles: React.CSSProperties = {
      width: '100%',
      minHeight: size === 'sm' ? '80px' : '120px',
      padding: theme.spacing[3],

      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.regular,
      fontWeight: theme.typography.fontWeight.regular,
      lineHeight: theme.typography.lineHeight.normal,

      backgroundColor: variantStyles.backgroundColor,
      color: variantStyles.color || theme.colors.textPrimary,
      // Use separate border properties instead of shorthand to avoid conflicts
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: variantStyles.borderColor,
      borderRadius: theme.borderRadius.lg,

      outline: 'none',
      transition: 'all 0.15s ease-in-out',
      resize: 'vertical',

      ...normalizedStyle,
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

    const helperTextStyles: React.CSSProperties = {
      fontSize: theme.typography.fontSize.sm,
      color: hasError ? theme.colors.error : theme.colors.textTertiary,
      marginTop: theme.spacing[1],
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      if (onFocus) {
        onFocus(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      if (onBlur) {
        onBlur(e);
      }
    };

    return (
      <div className={`textarea-container ${containerClassName}`} style={containerStyles}>
        {label && (
          <label style={labelStyles}>
            {label}
            {required && <span style={{ color: theme.colors.error }}> *</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={`textarea ${className}`}
          style={{
            ...textareaStyles,
            ...(isFocused ? focusStyles : {}),
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={hasError}
          aria-describedby={
            (errorText || helperText) ? `${props.id || 'textarea'}-helper` : undefined
          }
          {...props}
        />

        {(errorText || helperText) && (
          <div
            id={`${props.id || 'textarea'}-helper`}
            style={helperTextStyles}
          >
            {errorText || helperText}
          </div>
        )}

        <style jsx>{`
          .textarea::placeholder {
            color: ${variantStyles.placeholderColor || theme.colors.placeholder};
          }

          .textarea:focus {
            border-color: ${theme.components.input.focused.borderColor};
            box-shadow: ${theme.components.input.focused.boxShadow};
          }

          .textarea:focus-visible {
            outline: 2px solid ${theme.colors.borderFocus};
            outline-offset: 2px;
          }
        `}</style>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
