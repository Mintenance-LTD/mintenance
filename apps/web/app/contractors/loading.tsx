/**
 * Contractors List Loading State
 *
 * Displays skeleton loaders while contractor data is being fetched.
 * Matches the actual layout to prevent layout shift.
 */

import Skeleton, { SkeletonGroup } from '@/components/ui/Skeleton';

export default function ContractorsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-48" /> {/* Search */}
          <Skeleton className="h-10 w-32" /> {/* Service */}
          <Skeleton className="h-10 w-32" /> {/* Location */}
          <Skeleton className="h-10 w-32" /> {/* Rating */}
          <Skeleton className="h-10 w-32" /> {/* Price */}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-32" /> {/* Sort dropdown */}
      </div>

      {/* Contractor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, index) => (
          <ContractorCardSkeleton key={index} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-8 gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-10 rounded" />
        ))}
      </div>
    </div>
  );
}

/**
 * Contractor Card Skeleton Component
 * Reusable skeleton for contractor cards
 */
function ContractorCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header with Avatar and Info */}
      <div className="flex items-start gap-4 mb-4">
        <Skeleton variant="circular" className="h-16 w-16" />
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-4" />
            ))}
            <Skeleton className="h-4 w-12 ml-2" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" /> {/* Verified badge */}
      </div>

      {/* Services */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>

      {/* Recent Review */}
      <div className="border-t border-gray-100 pt-4">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-3 w-32 mt-2" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}