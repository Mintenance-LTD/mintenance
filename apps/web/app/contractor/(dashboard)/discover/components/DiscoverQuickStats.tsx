'use client';

import React from 'react';
import { MAX_RADIUS_MILES } from './DiscoverFilters';

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

      {/* Empty state */}
      {filteredJobCount === 0 && (
        <div
          className='rounded-2xl p-12 text-center'
          style={{
            background: 'var(--me-surface)',
            border: '1px solid var(--me-line)',
            boxShadow: 'var(--me-shadow-card)',
          }}
        >
          <div
            className='w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6'
            style={{
              background:
                'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
            }}
          >
            <svg
              className='w-12 h-12'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              style={{ color: 'var(--me-on-brand)' }}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h2
            className='text-3xl font-bold mb-3'
            style={{
              color: 'var(--me-ink)',
              fontFamily: 'var(--me-font-display)',
            }}
          >
            {hasContractorLocation && selectedRadius < MAX_RADIUS_MILES
              ? 'No Jobs in This Area'
              : "You're All Caught Up!"}
          </h2>
          <p className='text-lg mb-6' style={{ color: 'var(--me-ink-2)' }}>
            {hasContractorLocation && selectedRadius < MAX_RADIUS_MILES
              ? `No jobs found within ${selectedRadius} mi. Try increasing the radius.`
              : totalJobCount === 0
                ? 'No jobs available right now. Check back soon!'
                : 'No more jobs to review right now'}
          </p>
          {totalJobCount > 0 && (
            <button
              onClick={onReviewAgain}
              className='px-8 py-3 rounded-xl font-semibold transition-all'
              style={{
                background: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                boxShadow: 'var(--me-shadow-btn)',
              }}
            >
              Review Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
