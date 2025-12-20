'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface DiscoverHeaderProps {
  userRole?: 'contractor' | 'homeowner' | 'admin';
  remainingCount: number;
  progressPercentage?: number;
  matchCount?: number;
}

/**
 * Header component for the Discover page
 * Shows logo, title, and remaining items count
 */
export function DiscoverHeader({ userRole, remainingCount, progressPercentage = 0, matchCount = 0 }: DiscoverHeaderProps) {
  const isContractor = userRole === 'contractor';

  return (
    <>
      {/* Logo Header */}
      <div className="flex items-center justify-center p-6 bg-white border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center no-underline group">
          <div className="transform transition-transform group-hover:scale-110 duration-200">
            <Image src="/assets/icon.png" alt="Mintenance Logo" width={40} height={40} className="w-10 h-10" />
          </div>
          <span className="ml-3 text-2xl font-bold text-primary-900 tracking-tight">
            Mintenance
          </span>
        </Link>
      </div>

      {/* Title Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
        <div className="flex flex-wrap justify-between items-center gap-5">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              {isContractor ? 'Discover Jobs' : 'Discover Contractors'}
            </h1>
            <p className="text-base text-gray-600 font-normal">
              {isContractor
                ? 'Find your next project opportunity'
                : 'Swipe to find trusted professionals'}
            </p>
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            {/* Match Count Badge */}
            {matchCount > 0 && (
              <div className="text-center bg-teal-50 px-5 py-3 rounded-xl border border-teal-200 shadow-sm">
                <div className="text-2xl font-bold text-teal-700 leading-none">
                  {matchCount}
                </div>
                <div className="text-xs text-teal-600 font-medium">
                  {matchCount === 1 ? 'match' : 'matches'}
                </div>
              </div>
            )}

            {/* Remaining Count */}
            <div className="text-right bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900 leading-none">
                {remainingCount}
              </div>
              <div className="text-sm text-gray-600">
                remaining
              </div>
              {progressPercentage > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {progressPercentage}% complete
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

