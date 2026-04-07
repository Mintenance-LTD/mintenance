'use client';

import React from 'react';
import type { InputProps } from './types';

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
