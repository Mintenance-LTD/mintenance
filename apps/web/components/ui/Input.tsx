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

    return (
      <div className={cn(containerClassName)} style={containerStyle}>
        <SharedInput
          {...(props as any)}
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
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
