'use client';

import { Skeleton, SkeletonText, SkeletonBadge, SkeletonAvatar } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface JobCardSkeletonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export function JobCardSkeleton({ className, variant = 'default' }: JobCardSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <SkeletonBadge />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Skeleton className="h-7 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex gap-2">
              <SkeletonBadge />
              <SkeletonBadge />
              <SkeletonBadge />
            </div>
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>

        <SkeletonText lines={3} className="mb-4" />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <SkeletonAvatar size="sm" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <SkeletonBadge />
      </div>

      <SkeletonText lines={2} className="mb-4" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export function JobListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}