/**
 * TableSkeleton Component
 *
 * Content-shaped skeleton loader for data tables.
 * Includes header row and configurable data rows with varied column widths.
 *
 * @example
 * <TableSkeleton />
 * <TableSkeleton rows={10} columns={6} />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Skeleton, { SkeletonAvatar, SkeletonBadge } from '../Skeleton';

export interface TableSkeletonProps {
  /**
   * Number of data rows to render
   * @default 5
   */
  rows?: number;

  /**
   * Number of columns
   * @default 5
   */
  columns?: number;

  /**
   * Whether to show row avatars
   * @default false
   */
  showAvatars?: boolean;

  /**
   * Whether to show action buttons
   * @default true
   */
  showActions?: boolean;

  /**
   * Whether to show pagination
   * @default true
   */
  showPagination?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 5,
  showAvatars = false,
  showActions = true,
  showPagination = true,
  className,
}) => {
  return (
    <div
      className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}
      aria-busy="true"
      role="status"
    >
      {/* Table Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-40 rounded-md" />
          <SkeletonBadge />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Filters/Search Bar */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Head */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {/* Checkbox Column */}
              <th className="px-4 py-3 text-left w-12">
                <Skeleton className="h-4 w-4 rounded" />
              </th>

              {/* Avatar Column */}
              {showAvatars && (
                <th className="px-4 py-3 text-left w-16">
                  <Skeleton className="h-4 w-12 rounded-md" />
                </th>
              )}

              {/* Data Columns */}
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-24 rounded-md" />
                </th>
              ))}

              {/* Actions Column */}
              {showActions && (
                <th className="px-4 py-3 text-right w-32">
                  <Skeleton className="h-4 w-16 rounded-md ml-auto" />
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {/* Checkbox */}
                <td className="px-4 py-4">
                  <Skeleton className="h-4 w-4 rounded" />
                </td>

                {/* Avatar */}
                {showAvatars && (
                  <td className="px-4 py-4">
                    <SkeletonAvatar size="sm" />
                  </td>
                )}

                {/* Data Cells */}
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-4">
                    {colIndex === 0 ? (
                      // First column - typically main content
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                    ) : colIndex === 1 ? (
                      // Second column - often a badge/status
                      <SkeletonBadge />
                    ) : (
                      // Other columns - varied widths
                      <Skeleton
                        className="h-4 rounded-md"
                        width={`${60 + Math.random() * 40}%`}
                      />
                    )}
                  </td>
                ))}

                {/* Actions */}
                {showActions && (
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
          <Skeleton className="h-4 w-32 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSkeleton;
