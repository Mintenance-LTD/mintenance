'use client';

import { Skeleton, SkeletonText, SkeletonBadge, SkeletonAvatar, SkeletonButton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface ProfileSkeletonProps {
  className?: string;
  variant?: 'homeowner' | 'contractor' | 'compact';
}

export function ProfileSkeleton({ className, variant = 'homeowner' }: ProfileSkeletonProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <div className="flex items-center gap-4">
          <SkeletonAvatar size="xl" />
          <div className="flex-1">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'contractor') {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-6">
            <SkeletonAvatar size="xl" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <SkeletonButton size="lg" />
              </div>

              <div className="flex gap-6 mb-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-5 w-12" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-5 w-8" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>

              <div className="flex gap-2">
                <SkeletonBadge />
                <SkeletonBadge />
                <SkeletonBadge />
                <SkeletonBadge />
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <SkeletonText lines={4} />
        </div>

        {/* Services Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Portfolio Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default homeowner variant
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-6">
          <SkeletonAvatar size="xl" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
              <SkeletonButton size="lg" />
            </div>

            <div className="flex gap-6">
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Properties Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-64 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}