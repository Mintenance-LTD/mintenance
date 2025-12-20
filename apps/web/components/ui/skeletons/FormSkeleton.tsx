/**
 * FormSkeleton Component
 *
 * Content-shaped skeleton loader for form layouts.
 * Includes labels, input fields, and button placeholders.
 *
 * @example
 * <FormSkeleton />
 * <FormSkeleton fields={8} columns={2} />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Skeleton, { SkeletonButton } from '../Skeleton';

export interface FormSkeletonProps {
  /**
   * Number of form fields to render
   * @default 4
   */
  fields?: number;

  /**
   * Number of columns for the form layout
   * @default 1
   */
  columns?: 1 | 2;

  /**
   * Whether to show the submit button
   * @default true
   */
  showButton?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  columns = 1,
  showButton = true,
  className,
}) => {
  const gridCols = columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1';

  return (
    <div
      className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}
      aria-busy="true"
      role="status"
    >
      {/* Form Title */}
      <div className="mb-6">
        <Skeleton className="h-7 w-48 rounded-md mb-2" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>

      {/* Form Fields Grid */}
      <div className={cn('grid gap-6 mb-6', gridCols)}>
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            {/* Label */}
            <Skeleton className="h-4 w-24 rounded-md" />

            {/* Input Field */}
            <Skeleton className="h-11 w-full rounded-lg" />

            {/* Helper Text (occasional) */}
            {index % 3 === 0 && <Skeleton className="h-3 w-3/4 rounded-md" />}
          </div>
        ))}
      </div>

      {/* Textarea Field */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-3 w-40 rounded-md" />
      </div>

      {/* Checkbox/Toggle Section */}
      <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded-md flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-full max-w-xs rounded-md" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded-md flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-full max-w-sm rounded-md" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showButton && (
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
          <SkeletonButton size="lg" className="flex-1 md:flex-none md:w-32" />
          <SkeletonButton size="lg" className="flex-1 md:flex-none md:w-40" />
        </div>
      )}
    </div>
  );
};

export default FormSkeleton;
