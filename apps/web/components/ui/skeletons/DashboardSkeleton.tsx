/**
 * DashboardSkeleton Component
 *
 * Content-shaped skeleton loader for dashboard pages.
 * Includes KPI cards, chart placeholder, and table rows.
 *
 * @example
 * <DashboardSkeleton />
 * <DashboardSkeleton showChart={false} tableRows={10} />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Skeleton from '../Skeleton';

export interface DashboardSkeletonProps {
  /**
   * Number of KPI cards to show
   * @default 4
   */
  kpiCount?: number;

  /**
   * Whether to show the chart section
   * @default true
   */
  showChart?: boolean;

  /**
   * Number of table rows to show
   * @default 5
   */
  tableRows?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  kpiCount = 4,
  showChart = true,
  tableRows = 5,
  className,
}) => {
  return (
    <div className={cn('space-y-8', className)} aria-busy="true" role="status">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-ck-blue-50 to-ck-blue-100 rounded-2xl p-8">
        <Skeleton className="h-8 w-64 rounded-md mb-3" />
        <Skeleton className="h-5 w-96 rounded-md" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: kpiCount }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            {/* Icon and Title */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>

            {/* Value */}
            <Skeleton className="h-9 w-24 rounded-md mb-2" />

            {/* Label */}
            <Skeleton className="h-4 w-32 rounded-md mb-3" />

            {/* Trend */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      {showChart && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-6 w-48 rounded-md mb-2" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>

          {/* Chart Placeholder */}
          <div className="h-80 bg-gray-50 rounded-lg flex items-end justify-around p-6 gap-2">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton
                key={index}
                className="w-full rounded-t-md"
                style={{ height: `${Math.random() * 60 + 40}%` }}
              />
            ))}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-6 border-b border-gray-200">
          <Skeleton className="h-6 w-40 rounded-md" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {/* Column Headers */}
          <div className="flex items-center gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-40 rounded-md flex-1" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>

          {/* Table Rows */}
          {Array.from({ length: tableRows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center gap-4 px-6 py-4 border-b border-gray-100"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <Skeleton className="h-4 w-32 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
