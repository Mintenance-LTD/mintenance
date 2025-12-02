/**
 * JobCardSkeleton Component
 *
 * Content-shaped skeleton loader for job cards.
 * Matches the layout of JobCard2025 component.
 *
 * @example
 * <JobCardSkeleton />
 * <JobCardSkeleton count={3} />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Skeleton, { SkeletonBadge, SkeletonImage } from '../Skeleton';

export interface JobCardSkeletonProps {
  /**
   * Number of skeleton cards to render
   * @default 1
   */
  count?: number;

  /**
   * Whether to show the image placeholder
   * @default true
   */
  showImage?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const SingleJobCardSkeleton = ({
  showImage = true,
  className,
}: Omit<JobCardSkeletonProps, 'count'>) => {
  return (
    <article
      className={cn(
        'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden',
        className
      )}
      aria-busy="true"
      role="status"
    >
      {/* Image Section */}
      {showImage && (
        <div className="h-48 bg-gray-100">
          <SkeletonImage aspectRatio="video" className="h-full rounded-none" />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Title and Location */}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>

          {/* Budget */}
          <div className="text-right flex-shrink-0 space-y-1">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md ml-auto" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBadge />
          <SkeletonBadge className="w-20" />
          <SkeletonBadge className="w-24" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      </div>
    </article>
  );
};

export const JobCardSkeleton: React.FC<JobCardSkeletonProps> = ({
  count = 1,
  showImage = true,
  className,
}) => {
  if (count === 1) {
    return <SingleJobCardSkeleton showImage={showImage} className={className} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SingleJobCardSkeleton key={index} showImage={showImage} className={className} />
      ))}
    </>
  );
};

export default JobCardSkeleton;
