'use client';

import React from 'react';

interface DiscoverQuickStatsProps {
  filteredJobCount: number;
  savedJobCount: number;
  /** Radius in MILES (2026-07-20 — was km; see DiscoverFilters.RADII_MILES). */
  selectedRadius: number;
  hasContractorLocation: boolean;
  totalJobCount: number;
  onReviewAgain: () => void;
}

/**
 * Top stats bar showing available-job count, saved count, and an empty-state
 * "Review Again" prompt when there are no jobs left.
 */
export function DiscoverQuickStats({
  filteredJobCount,
  savedJobCount,
  selectedRadius,
  hasContractorLocation,
  totalJobCount,
  onReviewAgain,
}: DiscoverQuickStatsProps) {
  return (
    <div
      data-theme='mint-editorial'
      style={{ fontFamily: 'var(--me-font-body)' }}
    >
      {/* Quick Stats Bar */}
      <div
        className='rounded-xl p-4 mb-6 flex items-center justify-between'
        style={{
          background: 'var(--me-surface)',
          border: '1px solid var(--me-line)',
        }}
      >
        <div className='text-sm' style={{ color: 'var(--me-ink-2)' }}>
          Browse available projects and save your favorites
        </div>
        <div className='flex items-center gap-6'>
          <div className='text-right'>
            <div
              className='text-lg font-semibold'
              style={{ color: 'var(--me-ink)' }}
            >
              {filteredJobCount}
            </div>
            <div className='text-xs' style={{ color: 'var(--me-ink-2)' }}>
              Available Jobs
              {hasContractorLocation && (
                <span className='ml-1'>within {selectedRadius} mi</span>
              )}
            </div>
          </div>
          {savedJobCount > 0 && (
            <div className='text-right'>
              <div
                className='text-lg font-semibold'
                style={{ color: 'var(--me-brand)' }}
              >
                {savedJobCount}
              </div>
              <div className='text-xs' style={{ color: 'var(--me-ink-2)' }}>
                Saved
              </div>
            </div>
          )}
        </div>
      </div>
      {filteredJobCount === 0 && totalJobCount > 0 && (
        <button
          onClick={onReviewAgain}
          className='mb-4 rounded-xl border px-4 py-2 text-sm font-semibold'
        >
          Review saved and skipped results again
        </button>
      )}{' '}
    </div>
  );
}
