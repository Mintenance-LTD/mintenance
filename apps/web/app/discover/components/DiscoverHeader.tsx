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
      <div className="bg-primary-900 pt-10 pb-6 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

        <div className="max-w-[1200px] mx-auto flex flex-wrap justify-between items-center px-5 gap-5 relative z-10">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {isContractor ? 'Discover Jobs' : 'Discover Contractors'}
            </h1>
            <p className="text-lg text-primary-200 font-normal">
              {isContractor
                ? 'Find your next project opportunity'
                : 'Swipe to find trusted professionals'}
            </p>
          </div>

          <div className="flex gap-4 items-center flex-wrap">
            {/* Match Count Badge */}
            {matchCount > 0 && (
              <div className="text-center bg-emerald-500 px-5 py-3 rounded-2xl border border-white/30 shadow-lg animate-in fade-in zoom-in duration-300">
                <div className="text-2xl font-bold text-white leading-none">
                  {matchCount}
                </div>
                <div className="text-xs text-white/90 font-medium">
                  {matchCount === 1 ? 'match' : 'matches'}
                </div>
              </div>
            )}

            {/* Remaining Count */}
            <div className="text-right bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-sm">
              <div className="text-2xl font-bold text-white leading-none">
                {remainingCount}
              </div>
              <div className="text-sm text-primary-200">
                remaining
              </div>
              {progressPercentage > 0 && (
                <div className="text-xs text-primary-300 mt-1">
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

