'use client';

import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
  hideLabel?: boolean; // Visually hide label but keep for screen readers
  showRequiredIndicator?: boolean;
  characterCount?: {
    current: number;
    max: number;
  };
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaErrorMessage?: string;
}

/**
 * Accessible input component that follows WCAG 2.1 AA guidelines
 * - Associates labels with inputs
 * - Provides error/success states with announcements
 * - Includes helper text and character count
 * - Maintains proper ARIA attributes
 */
export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      icon,
      hideLabel = false,
      showRequiredIndicator = false,
      characterCount,
      className,
      id,
      required,
      disabled,
      ariaDescribedBy,
      ariaInvalid,
      ariaErrorMessage,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const countId = `${inputId}-count`;

    // Determine which IDs to include in aria-describedby
    const describedByIds = [
      ariaDescribedBy,
      error && errorId,
      helperText && helperId,
      characterCount && countId,
    ].filter(Boolean).join(' ');

    // Determine aria-invalid state
    const isInvalid = ariaInvalid !== undefined ? ariaInvalid : !!error;

    // Base input styles
    const inputStyles = cn(
      // Base styles
      'w-full px-3 py-2 rounded-md',
      'text-gray-900 placeholder-gray-400',
      'transition-all duration-200',

      // Border styles
      'border',
      error ? 'border-red-500' : success ? 'border-green-500' : 'border-gray-300',

      // Focus styles (WCAG 2.4.7)
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      error ? 'focus:ring-red-500' : success ? 'focus:ring-green-500' : 'focus:ring-[#0066CC]',

      // Disabled styles
      'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',

      // Icon padding
      icon && 'pl-10',

      // Custom classes
      className
    );

    return (
      <div className="space-y-1">
        {/* Label */}
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {showRequiredIndicator && required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        {/* Input container */}
        <div className="relative">
          {/* Icon */}
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400" aria-hidden="true">
                {icon}
              </span>
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            className={inputStyles}
            disabled={disabled}
            required={required}
            aria-required={required}
            aria-invalid={isInvalid}
            aria-describedby={describedByIds || undefined}
            aria-errormessage={error ? errorId : ariaErrorMessage}
            {...props}
          />

          {/* Status icon */}
          {(error || success) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
              ) : success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
              ) : null}
            </div>
          )}
        </div>

        {/* Helper text */}
        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {/* Character count */}
        {characterCount && (
          <p
            id={countId}
            className={cn(
              'text-sm text-right',
              characterCount.current > characterCount.max
                ? 'text-red-600'
                : 'text-gray-500'
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {characterCount.current}/{characterCount.max} characters
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

export interface AccessibleTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  hideLabel?: boolean;
  showRequiredIndicator?: boolean;
  characterCount?: {
    current: number;
    max: number;
  };
  resizable?: boolean;
}

/**
 * Accessible textarea component
 */
export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      hideLabel = false,
      showRequiredIndicator = false,
      characterCount,
      resizable = true,
      className,
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs
    const textareaId = id || React.useId();
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;
    const countId = `${textareaId}-count`;

    // Determine which IDs to include in aria-describedby
    const describedByIds = [
      error && errorId,
      helperText && helperId,
      characterCount && countId,
    ].filter(Boolean).join(' ');

    // Base textarea styles
    const textareaStyles = cn(
      // Base styles
      'w-full px-3 py-2 rounded-md',
      'text-gray-900 placeholder-gray-400',
      'transition-all duration-200',

      // Border styles
      'border',
      error ? 'border-red-500' : success ? 'border-green-500' : 'border-gray-300',

      // Focus styles
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      error ? 'focus:ring-red-500' : success ? 'focus:ring-green-500' : 'focus:ring-[#0066CC]',

      // Disabled styles
      'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',

      // Resize control
      !resizable && 'resize-none',

      // Custom classes
      className
    );

    return (
      <div className="space-y-1">
        {/* Label */}
        <label
          htmlFor={textareaId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {showRequiredIndicator && required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaStyles}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedByIds || undefined}
          aria-errormessage={error ? errorId : undefined}
          {...props}
        />

        {/* Helper text */}
        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {/* Character count */}
        {characterCount && (
          <p
            id={countId}
            className={cn(
              'text-sm text-right',
              characterCount.current > characterCount.max
                ? 'text-red-600'
                : 'text-gray-500'
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {characterCount.current}/{characterCount.max} characters
          </p>
        )}
      </div>
    );
  }
);

AccessibleTextarea.displayName = 'AccessibleTextarea';

/**
 * Accessible select dropdown
 */
export interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  hideLabel?: boolean;
  showRequiredIndicator?: boolean;
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  placeholder?: string;
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  (
    {
      label,
      error,
      helperText,
      hideLabel = false,
      showRequiredIndicator = false,
      options,
      placeholder = 'Select an option',
      className,
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const describedByIds = [
      error && errorId,
      helperText && helperId,
    ].filter(Boolean).join(' ');

    const selectStyles = cn(
      'w-full px-3 py-2 rounded-md',
      'text-gray-900 bg-white',
      'border',
      error ? 'border-red-500' : 'border-gray-300',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      error ? 'focus:ring-red-500' : 'focus:ring-[#0066CC]',
      'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
      className
    );

    return (
      <div className="space-y-1">
        <label
          htmlFor={selectId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {showRequiredIndicator && required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        <select
          ref={ref}
          id={selectId}
          className={selectStyles}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedByIds || undefined}
          aria-errormessage={error ? errorId : undefined}
          defaultValue=""
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';

export default AccessibleInput;