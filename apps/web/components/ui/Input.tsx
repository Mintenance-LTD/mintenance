/**
 * Input Component - Compatibility Wrapper
 * 
 * Wraps the shared Input component to maintain backward compatibility
 * with existing web app code while migrating to shared components.
 * 
 * This wrapper will be removed once all files are migrated.
 */

'use client';

import React, { useId } from 'react';
import { Input as SharedInput } from '@mintenance/shared-ui';
import type { WebInputProps } from '@mintenance/shared-ui';
import { cn } from '@/lib/utils';

// Extend shared Input props for backward compatibility
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<WebInputProps, 'type' | 'size' | 'error'> {
  type?: InputType;
  size?: InputSize;
  label?: string;
  helperText?: string;
  error?: string | boolean; // Support both string and boolean for backward compatibility
  errorText?: string; // Alternative prop name
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  variant?: 'default' | 'focused' | 'error';
  onRightIconClick?: () => void;
  fullWidth?: boolean;
}

/**
 * Compatibility wrapper for Input component
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    type = 'text',
    size = 'md',
    label,
    helperText,
    error,
    errorText,
    success,
    leftIcon,
    rightIcon,
    containerClassName,
    containerStyle,
    variant,
    onRightIconClick,
    fullWidth,
    className = '',
    id,
    style,
    ...props
  }, ref) => {
    // Generate a stable ID using useId() to prevent hydration mismatches
    // This ensures the same ID is used on both server and client
    const generatedId = useId();
    const stableId = id || generatedId;

    // Map error prop (can be string or boolean) to errorText (string) and error (boolean)
    const effectiveErrorText = typeof error === 'string' 
      ? error 
      : errorText;
    const effectiveError = typeof error === 'boolean' ? error : !!effectiveErrorText;
    const effectiveSuccess = success;

    // Normalize style prop to remove any border shorthand properties
    // The shared Input component uses separate border properties (borderWidth, borderStyle, borderColor)
    // so we must remove any shorthand 'border' properties to prevent React warnings
    const propsStyle = (props as any).style;
    const allStyles = [style, propsStyle].filter(Boolean);
    const mergedStyle = allStyles.length > 0 
      ? Object.assign({}, ...allStyles) 
      : {};
    
    // Remove all border-related properties from merged style
    const normalizedStyle: React.CSSProperties = {};
    const borderShorthandProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'borderStyle', 'borderColor'];
    
    Object.keys(mergedStyle).forEach(key => {
      if (!borderShorthandProps.includes(key)) {
        normalizedStyle[key as keyof React.CSSProperties] = mergedStyle[key];
      }
    });

    // Remove style and border properties from props to prevent them from being spread
    const { style: _, ...propsWithoutStyle } = props as any;

    // Clean ALL border-related properties from props (including any that might come from React Hook Form)
    // This ensures no border shorthand properties slip through to the SharedInput component
    const cleanedProps: any = {};
    const borderProps = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'borderStyle', 'borderColor'];
    Object.keys(propsWithoutStyle).forEach(key => {
      // Also check if the value itself is an object with border properties (nested styles)
      const value = propsWithoutStyle[key];
      if (borderProps.includes(key)) {
        // Skip border properties
        return;
      }
      // If value is an object with a style property, clean it too
      if (value && typeof value === 'object' && 'style' in value && typeof value.style === 'object') {
        const cleanedValue = { ...value };
        const cleanedNestedStyle: any = {};
        Object.keys(value.style).forEach(styleKey => {
          if (!borderProps.includes(styleKey)) {
            cleanedNestedStyle[styleKey] = value.style[styleKey];
          }
        });
        cleanedValue.style = cleanedNestedStyle;
        cleanedProps[key] = cleanedValue;
      } else {
        cleanedProps[key] = value;
      }
    });

    return (
      <div className={cn(containerClassName)} style={containerStyle}>
        <SharedInput
          {...cleanedProps}
          ref={ref}
          id={stableId}
          type={type}
          size={size}
          label={label}
          helperText={helperText}
          error={effectiveError}
          errorText={effectiveErrorText}
          success={effectiveSuccess}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          className={cn(className)}
          style={normalizedStyle}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
