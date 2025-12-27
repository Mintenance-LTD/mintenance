import { Skeleton } from '@/components/ui/Skeleton';
import { ContractorCardSkeleton } from '@/components/skeletons/ContractorCardSkeleton';

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        {/* Favorites Grid */}
        <ContractorCardSkeleton />
        <ContractorCardSkeleton variant="detailed" />
        <ContractorCardSkeleton />

        {/* Empty State Skeleton (shown when loading initial data) */}
        <div className="hidden first:block">
          <div className="text-center py-12">
            <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}