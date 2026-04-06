import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { FormErrors } from './types';

export function fieldErrorRenderer(errors: FormErrors) {
  return (field: keyof FormErrors) => {
    if (!errors[field]) return null;
    return (
      <p id={`${field}-error`} className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {errors[field]}
      </p>
    );
  };
}

export function inputClassRenderer(errors: FormErrors) {
  return (field: keyof FormErrors) =>
    `w-full px-3 py-2.5 border rounded-lg transition-colors focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
      errors[field]
        ? 'border-red-300 bg-red-50 focus:ring-red-500'
        : 'border-gray-300 bg-white'
    }`;
}
