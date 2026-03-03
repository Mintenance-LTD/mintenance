'use client';

import { Search, Maximize2 } from 'lucide-react';

interface DiscoverJobsEmptyStateProps {
  hasLocation: boolean;
  onExpandRadius: () => void;
}

/** Empty state for the map-based job discover page when no jobs match filters */
export function DiscoverJobsEmptyState({ hasLocation, onExpandRadius }: DiscoverJobsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center w-full">
      <div className="mb-5 w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
        <Search className="w-9 h-9 text-gray-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found nearby</h3>

      <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
        {hasLocation
          ? 'No available jobs match your current filters and search radius.'
          : 'Add your location to discover jobs near you.'}
      </p>

      {hasLocation && (
        <button
          onClick={onExpandRadius}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Maximize2 className="w-4 h-4" />
          Expand Search Radius
        </button>
      )}
    </div>
  );
}
