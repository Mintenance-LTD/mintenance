/**
 * ContractorCardSkeleton Component
 *
 * Content-shaped skeleton loader for contractor cards.
 * Includes avatar, name, rating, skills badges, and portfolio thumbnails.
 *
 * @example
 * <ContractorCardSkeleton />
 * <ContractorCardSkeleton count={4} />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Skeleton, { SkeletonAvatar, SkeletonBadge, SkeletonButton } from '../Skeleton';

export interface ContractorCardSkeletonProps {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;

  /**
   * Whether to show portfolio thumbnails
   * @default true
   */
  showPortfolio?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const SingleContractorCardSkeleton = ({
  showPortfolio = true,
  className,
}: Omit<ContractorCardSkeletonProps, 'count'>) => {
  return (
    <article
      className={cn(
        'bg-white rounded-2xl border border-gray-200 shadow-sm p-6',
        className
      )}
      aria-busy="true"
      role="status"
    >
      {/* Header with Avatar and Info */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <SkeletonAvatar size="lg" />

        {/* Name, Rating, and Badge */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <SkeletonBadge className="w-24" />
        </div>

        {/* Favorite Button */}
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Bio/Description */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
      </div>

      {/* Skills/Specialties */}
      <div className="mb-4">
        <Skeleton className="h-4 w-20 rounded-md mb-3" />
        <div className="flex flex-wrap gap-2">
          <SkeletonBadge className="w-20" />
          <SkeletonBadge className="w-24" />
          <SkeletonBadge className="w-28" />
          <SkeletonBadge className="w-16" />
        </div>
      </div>

      {/* Portfolio Thumbnails */}
      {showPortfolio && (
        <div className="mb-4">
          <Skeleton className="h-4 w-24 rounded-md mb-3" />
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-6 mb-4 pt-4 border-t border-gray-100">
        <div className="space-y-1">
          <Skeleton className="h-6 w-12 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-6 w-12 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-6 w-12 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <SkeletonButton className="flex-1" />
        <SkeletonButton size="lg" className="w-32" />
      </div>
    </article>
  );
};

export const ContractorCardSkeleton: React.FC<ContractorCardSkeletonProps> = ({
  count = 1,
  showPortfolio = true,
  className,
}) => {
  if (count === 1) {
    return <SingleContractorCardSkeleton showPortfolio={showPortfolio} className={className} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SingleContractorCardSkeleton
          key={index}
          showPortfolio={showPortfolio}
          className={className}
        />
      ))}
    </>
  );
};

export default ContractorCardSkeleton;
