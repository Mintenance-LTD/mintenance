import { Skeleton } from '@/components/ui/Skeleton';
import { JobCardSkeleton } from '@/components/skeletons/JobCardSkeleton';
import { ContractorCardSkeleton } from '@/components/skeletons/ContractorCardSkeleton';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <Skeleton className="h-12 w-full max-w-2xl mb-4 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-6 w-32 mb-4" />

              {/* Filter Sections */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mb-6 last:mb-0">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>

            {/* Mixed Results - Jobs and Contractors */}
            <div className="space-y-6">
              <JobCardSkeleton />
              <ContractorCardSkeleton />
              <JobCardSkeleton />
              <ContractorCardSkeleton />
              <JobCardSkeleton />
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center">
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-10 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}