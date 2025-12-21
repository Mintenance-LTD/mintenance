'use client';

import React from 'react';

export interface ChartSkeletonProps {
  height?: string;
  title?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = '320px',
  title
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      {title && (
        <div className="mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>
      )}
      <div
        className="bg-gray-100 rounded"
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">Loading chart...</div>
        </div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white p-8 rounded-xl">
        <div className="h-8 bg-white/20 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-white/20 rounded w-1/2"></div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton title="Chart 1" />
        <ChartSkeleton title="Chart 2" />
      </div>
    </div>
  );
};

export default ChartSkeleton;
