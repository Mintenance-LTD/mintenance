'use client';

import React from 'react';
import type { InputProps } from './types';

/**
 * @deprecated Sprint 7 (5.1) — use `@mintenance/shared-ui`'s `Input`
 * instead. Duplicated primitive; see
 * `components/airbnb-system/README.md` for migration.
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className='w-full'>
      {label && (
        <label className='block text-sm font-semibold text-gray-900 mb-2'>
          {label}
        </label>
      )}
      <input
        className={`input-airbnb ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
      {helperText && !error && (
        <p className='mt-2 text-sm text-gray-600'>{helperText}</p>
      )}
    </div>
  );
};
