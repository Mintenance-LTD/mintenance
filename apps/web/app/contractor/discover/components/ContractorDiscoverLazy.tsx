'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
// Loading skeleton that matches the discover page layout
function DiscoverLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search bar skeleton */}
      <div className="mb-6">
        <Skeleton className="h-12 w-full max-w-2xl mx-auto rounded-lg" />
      </div>
      {/* Filters skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      {/* Map and listings skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map skeleton */}
        <div className="order-2 lg:order-1">
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
        {/* Job listings skeleton */}
        <div className="order-1 lg:order-2 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// Lazy load the heavy discover component
export const ContractorDiscoverLazy = dynamic(
  () => import('./ContractorDiscoverClient').then(mod => ({
    default: mod.ContractorDiscoverClient
  })),
  {
    loading: () => <DiscoverLoadingSkeleton />,
    ssr: false, // Disable SSR for this heavy client component with map
  }
);
export default ContractorDiscoverLazy;