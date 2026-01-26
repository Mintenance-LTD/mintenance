import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
// Loading skeleton that matches the bid submission layout
function BidSubmissionLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Job details skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
        {/* Bid form skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          {/* Amount input */}
          <div className="mb-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
          {/* Timeline */}
          <div className="mb-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
          {/* Description */}
          <div className="mb-4">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-32 w-full rounded" />
          </div>
          {/* Submit button */}
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        {/* Similar bids skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// Lazy load the heavy bid submission component
export const BidSubmissionLazy = dynamic(
  () => import('./BidSubmissionClient2025').then(mod => ({
    default: mod.BidSubmissionClient2025
  })),
  {
    loading: () => <BidSubmissionLoadingSkeleton />,
    ssr: true, // Keep SSR for SEO on bid pages
  }
);
export default BidSubmissionLazy;