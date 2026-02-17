'use client';

import React from 'react';

interface DiscoverQuickStatsProps {
  filteredJobCount: number;
  savedJobCount: number;
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
    <>
      {/* Quick Stats Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Browse available projects and save your favorites
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {filteredJobCount}
            </div>
            <div className="text-gray-600 text-xs">
              Available Jobs
              {hasContractorLocation && (
                <span className="ml-1">within {selectedRadius}km</span>
              )}
            </div>
          </div>
          {savedJobCount > 0 && (
            <div className="text-right">
              <div className="text-lg font-semibold text-teal-600">
                {savedJobCount}
              </div>
              <div className="text-gray-600 text-xs">Saved</div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filteredJobCount === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {hasContractorLocation && selectedRadius < 100
              ? 'No Jobs in This Area'
              : "You're All Caught Up!"}
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            {hasContractorLocation && selectedRadius < 100
              ? `No jobs found within ${selectedRadius}km. Try increasing the radius.`
              : totalJobCount === 0
                ? 'No jobs available right now. Check back soon!'
                : 'No more jobs to review right now'}
          </p>
          {totalJobCount > 0 && (
            <button
              onClick={onReviewAgain}
              className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-all"
            >
              Review Again
            </button>
          )}
        </div>
      )}
    </>
  );
}
