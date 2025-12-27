'use client';

import { Skeleton, SkeletonText, SkeletonBadge, SkeletonAvatar, SkeletonImage } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface ContractorCardSkeletonProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export function ContractorCardSkeleton({ className, variant = 'default' }: ContractorCardSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="md" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
        <div className="relative">
          <SkeletonImage aspectRatio="video" className="h-48" />
          <div className="absolute top-4 right-4">
            <SkeletonBadge />
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <SkeletonAvatar size="lg" />
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="flex gap-2">
                <SkeletonBadge />
                <SkeletonBadge />
                <SkeletonBadge />
              </div>
            </div>
          </div>

          <SkeletonText lines={3} className="mb-4" />

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <Skeleton className="h-6 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm p-5', className)}>
      <div className="flex items-start gap-4 mb-4">
        <SkeletonAvatar size="lg" />
        <div className="flex-1">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <SkeletonBadge />
        <SkeletonBadge />
        <SkeletonBadge />
      </div>

      <SkeletonText lines={2} className="mb-4" />

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function ContractorListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ContractorCardSkeleton key={i} />
      ))}
    </div>
  );
}