/**
 * Input Component - Web Implementation
 * 
 * Web-specific Input component using design tokens
 */

'use client';

import React, { useState, useId, forwardRef } from 'react';
import { webTokens } from '@mintenance/design-tokens';
import { cn } from '../../utils/cn';
import type { WebInputProps, InputSize } from './types';

/**
 * Input Component for Web
 * 
 * Uses design tokens for consistent styling across platforms
 */
export const Input = forwardRef<HTMLInputElement, WebInputProps>((props, ref) => {
  const {
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
    ...restProps
  } = props;
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

  // Focus styles - only set borderColor, never use border shorthand
  const focusStyles: React.CSSProperties = isFocused && !disabled
    ? {
        borderColor: hasError ? webTokens.colors.error : hasSuccess ? webTokens.colors.success : webTokens.colors.primary,
        boxShadow: `0 0 0 3px ${hasError ? webTokens.colors.error + '20' : hasSuccess ? webTokens.colors.success + '20' : webTokens.colors.primary + '20'}`,
      }
    : {};

  // Normalize style prop to avoid mixing shorthand and non-shorthand border properties
  // Extract style from props if it exists (React Hook Form might pass it through spread)
  const propsStyle = (props as any).style;
  const allStyles = [style, propsStyle].filter(Boolean);
  const mergedStyle = allStyles.length > 0 
    ? Object.assign({}, ...allStyles) 
    : {};
  
  // Remove all border-related shorthand and non-shorthand properties to avoid conflicts
  // We use separate border properties (borderWidth, borderStyle, borderColor) so we must
  // remove any shorthand 'border' property to prevent React warnings
  const borderProperties = [
    'border',           // Shorthand - conflicts with borderWidth/borderStyle/borderColor
    'borderTop',       // Shorthand - could conflict
    'borderRight',     // Shorthand - could conflict
    'borderBottom',    // Shorthand - could conflict
    'borderLeft',      // Shorthand - could conflict
    'borderWidth',     // Individual - we set this ourselves
    'borderStyle',     // Individual - we set this ourselves
    // Note: We allow borderColor to be overridden from normalizedStyle, but we'll merge it carefully
  ];
  
  const normalizedStyle: React.CSSProperties = {};
  let normalizedBorderColor: string | undefined;
  
  Object.keys(mergedStyle).forEach(key => {
    if (key === 'borderColor') {
      // Store borderColor separately - we'll merge it carefully with our own borderColor
      normalizedBorderColor = mergedStyle[key] as string;
    } else if (!borderProperties.includes(key)) {
      normalizedStyle[key as keyof React.CSSProperties] = mergedStyle[key];
    }
  });

  // Remove style from props to prevent it from being spread on the input element
  const { style: _, ...propsWithoutStyle } = restProps as any;

  // Also filter out any border-related properties from props that might be spread
  // This prevents React Hook Form or other libraries from adding border shorthand
  const cleanedProps: any = {};
  const borderProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'borderStyle', 'borderColor'];
  Object.keys(propsWithoutStyle).forEach(key => {
    if (!borderProps.includes(key)) {
      cleanedProps[key] = propsWithoutStyle[key];
    }
  });

  // Final safety check: explicitly remove any border shorthand that might have slipped through
  // This ensures React never sees both 'border' and 'borderColor' at the same time
  const finalCleanedProps: any = { ...cleanedProps };
  const borderShorthandProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
  borderShorthandProps.forEach(prop => {
    if (prop in finalCleanedProps) {
      delete finalCleanedProps[prop];
    }
  });

  // Build final input styles ensuring no border shorthand conflicts
  // Order matters: baseStyles -> normalizedStyle -> focusStyles (which sets borderColor)
  // If normalizedStyle has borderColor, it will be overridden by focusStyles when focused
  const inputStyles: React.CSSProperties = {
    ...baseStyles,
    ...normalizedStyle,
    // Apply normalized borderColor only if not focused (focusStyles will override)
    ...(normalizedBorderColor && !isFocused ? { borderColor: normalizedBorderColor } : {}),
    ...focusStyles, // Apply focus styles last so borderColor override works correctly
  };
  
  // CRITICAL: Remove all border shorthand properties BEFORE they can conflict with borderColor
  // This must happen after merging all styles to catch any that slipped through
  // React will warn if both 'border' and 'borderColor' exist simultaneously
  const borderShorthandKeys = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'];
  borderShorthandKeys.forEach(key => {
    if (key in inputStyles) {
      delete (inputStyles as any)[key];
    }
  });
  
  // Also ensure no borderWidth or borderStyle from normalizedStyle conflicts
  // We set these ourselves in baseStyles, so remove any from normalizedStyle
  if ('borderWidth' in normalizedStyle && normalizedStyle.borderWidth !== baseStyles.borderWidth) {
    // Only remove if it's different from what we set
    delete (inputStyles as any).borderWidth;
    inputStyles.borderWidth = baseStyles.borderWidth;
  }
  if ('borderStyle' in normalizedStyle && normalizedStyle.borderStyle !== baseStyles.borderStyle) {
    delete (inputStyles as any).borderStyle;
    inputStyles.borderStyle = baseStyles.borderStyle;
  }

  // FINAL CHECK: Ensure borderColor is never removed if border shorthand exists
  // If somehow border shorthand still exists, remove borderColor to avoid conflict
  // But ideally, border shorthand should never exist at this point
  const hasBorderShorthand = borderShorthandKeys.some(key => key in inputStyles);
  if (hasBorderShorthand && 'borderColor' in inputStyles) {
    // This shouldn't happen, but if it does, remove borderColor to avoid React warning
    delete (inputStyles as any).borderColor;
  }

  // Use useId() hook to generate stable IDs that match between server and client
  // This prevents hydration mismatches
  const generatedId = useId();
  const inputId = props.id || generatedId;
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
          ref={ref}
          {...finalCleanedProps}
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
});

Input.displayName = 'Input';

export default Input;

