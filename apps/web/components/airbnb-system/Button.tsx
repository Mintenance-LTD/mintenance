'use client';

import React from 'react';
import type { ButtonProps } from './types';

/**
 * @deprecated Sprint 7 (5.1) — use `@mintenance/shared-ui`'s `Button`
 * instead. This button lives under `components/airbnb-system/` which is
 * the landing-page-only component library; a generic Button does not
 * belong here. See `components/airbnb-system/README.md` for the migration
 * plan. Only 2 call sites currently use this symbol — do not add more.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'bg-transparent border-none hover:bg-gray-100 text-gray-900',
    outline:
      'inline-flex items-center justify-center rounded-xl font-semibold text-gray-900 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50',
    link: 'bg-transparent border-none text-teal-600 hover:text-teal-700 underline-offset-4 hover:underline',
    danger:
      'inline-flex items-center justify-center rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md',
    destructive:
      'inline-flex items-center justify-center rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md',
    success:
      'inline-flex items-center justify-center rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm hover:shadow-md',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} transition-all duration-150 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className='flex items-center justify-center gap-2'>
          <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
          <span className='sr-only'>Loading</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
