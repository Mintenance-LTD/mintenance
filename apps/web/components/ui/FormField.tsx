'use client';

import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

/**
 * FormField Component - Checkatrade-style form field with validation states
 *
 * Features:
 * - Inline error messages with icons
 * - Success states with checkmarks
 * - Helper text for guidance
 * - Clear required field indicators
 * - Accessible labels and error associations
 */
export function FormField({
  label,
  required = false,
  error,
  success = false,
  helperText,
  children,
  className,
  htmlFor,
}: FormFieldProps) {
  const hasError = Boolean(error);
  const showSuccess = success && !hasError;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-gray-700"
      >
        {label}
        {required && (
          <span className="text-rose-600 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Input wrapper with validation icons */}
      <div className="relative">
        {children}

        {/* Success icon */}
        {showSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle
              className="w-5 h-5 text-emerald-500"
              aria-label="Valid input"
            />
          </div>
        )}

        {/* Error icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle
              className="w-5 h-5 text-rose-500"
              aria-label="Invalid input"
            />
          </div>
        )}
      </div>

      {/* Helper text (shown when no error) */}
      {!hasError && helperText && (
        <p className="text-sm text-gray-500 flex items-start gap-1.5">
          <span className="text-gray-400 mt-0.5">ℹ</span>
          <span>{helperText}</span>
        </p>
      )}

      {/* Error message */}
      {hasError && (
        <div
          className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Success message (optional) */}
      {showSuccess && helperText && (
        <div
          className="flex items-start gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{helperText}</span>
        </div>
      )}
    </div>
  );
}

/**
 * ValidatedInput Component - Input with built-in validation styling
 */
export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

export function ValidatedInput({
  error,
  success,
  className,
  ...props
}: ValidatedInputProps) {
  return (
    <input
      className={cn(
        // Base styles
        'w-full px-4 py-3 border rounded-xl transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        // Default state
        'border-gray-300 focus:ring-teal-500 focus:border-teal-500',
        // Error state
        error && 'border-rose-300 bg-rose-50 focus:ring-rose-500 focus:border-rose-500 pr-10',
        // Success state
        success && !error && 'border-emerald-300 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-500 pr-10',
        // Disabled state
        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
        className
      )}
      aria-invalid={error}
      {...props}
    />
  );
}

/**
 * ValidatedTextarea Component - Textarea with built-in validation styling
 */
export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

export function ValidatedTextarea({
  error,
  success,
  className,
  ...props
}: ValidatedTextareaProps) {
  return (
    <textarea
      className={cn(
        // Base styles
        'w-full px-4 py-3 border rounded-xl transition-all resize-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        // Default state
        'border-gray-300 focus:ring-teal-500 focus:border-teal-500',
        // Error state
        error && 'border-rose-300 bg-rose-50 focus:ring-rose-500 focus:border-rose-500',
        // Success state
        success && !error && 'border-emerald-300 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-500',
        // Disabled state
        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
        className
      )}
      aria-invalid={error}
      {...props}
    />
  );
}

/**
 * ValidatedSelect Component - Select with built-in validation styling
 */
export interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  success?: boolean;
}

export function ValidatedSelect({
  error,
  success,
  className,
  children,
  ...props
}: ValidatedSelectProps) {
  return (
    <select
      className={cn(
        // Base styles
        'w-full px-4 py-3 border rounded-xl transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        // Default state
        'border-gray-300 focus:ring-teal-500 focus:border-teal-500',
        // Error state
        error && 'border-rose-300 bg-rose-50 focus:ring-rose-500 focus:border-rose-500',
        // Success state
        success && !error && 'border-emerald-300 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-500',
        // Disabled state
        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
        className
      )}
      aria-invalid={error}
      {...props}
    >
      {children}
    </select>
  );
}
