'use client';

import { Search, Maximize2 } from 'lucide-react';

interface DiscoverJobsEmptyStateProps {
  hasLocation: boolean;
  radiusSearchAvailable: boolean;
  onExpandRadius?: () => void;
}

/** Empty state for the map-based job discover page when no jobs match filters */
export function DiscoverJobsEmptyState({
  hasLocation,
  radiusSearchAvailable,
  onExpandRadius,
}: DiscoverJobsEmptyStateProps) {
  return (
    <div
      data-theme='mint-editorial'
      className='flex flex-col items-center justify-center py-20 text-center w-full'
      style={{ fontFamily: 'var(--me-font-body)' }}
    >
      <div
        className='mb-5 w-20 h-20 rounded-full flex items-center justify-center'
        style={{ background: 'var(--me-bg-2)' }}
      >
        <Search className='w-9 h-9' style={{ color: 'var(--me-ink-3)' }} />
      </div>

      <h3
        className='text-lg font-semibold mb-2'
        style={{ color: 'var(--me-ink)' }}
      >
        {radiusSearchAvailable ? 'No jobs found nearby' : 'No jobs to show'}
      </h3>

      <p
        className='text-sm mb-6 max-w-xs leading-relaxed'
        style={{ color: 'var(--me-ink-3)' }}
      >
        {radiusSearchAvailable
          ? 'No available jobs match your current filters and search radius.'
          : hasLocation
            ? 'Distance results are temporarily unavailable. Refresh to try again.'
            : 'Add your location to discover jobs near you.'}
      </p>

      {onExpandRadius && (
        <button
          onClick={onExpandRadius}
          className='inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors'
          style={{
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
            boxShadow: 'var(--me-shadow-btn)',
          }}
        >
          <Maximize2 className='w-4 h-4' />
          Expand Search Radius
        </button>
      )}
    </div>
  );
}
