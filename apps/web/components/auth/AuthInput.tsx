'use client';

import React from 'react';
import { Input, InputType } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AuthInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'value' | 'defaultValue'> {
  label: string;
  type?: InputType;
  value?: string;
  defaultValue?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
  showSuccess?: boolean;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, helperText, showSuccess, className, id, type, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-sm font-medium text-[#111827]">
          {label}
        </Label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              icon && 'pl-10',
              'focus:ring-teal-500 focus:border-teal-500',
              showSuccess && !error && 'border-teal-500 focus:ring-teal-500',
              className
            )}
            error={!!error}
            errorText={error}
            {...(props as Record<string, unknown>)}
          />
          {showSuccess && !error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        {helperText && !error && (
          <p className="text-xs text-[#6B7280]">{helperText}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
