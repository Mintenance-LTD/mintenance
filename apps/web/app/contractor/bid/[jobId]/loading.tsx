import { Skeleton, SkeletonText, SkeletonBadge } from '@/components/ui/Skeleton';

export default function SubmitBidLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="animate-pulse">
            <Skeleton className="h-8 w-56 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main bid form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse space-y-6">
                  {/* Bid amount */}
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-4 w-64 mt-2" />
                  </div>

                  {/* Timeline */}
                  <div>
                    <Skeleton className="h-5 w-40 mb-2" />
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  </div>

                  {/* Proposal */}
                  <div>
                    <Skeleton className="h-5 w-36 mb-2" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-4 w-48 mt-2" />
                  </div>

                  {/* Materials breakdown */}
                  <div>
                    <Skeleton className="h-5 w-48 mb-3" />
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-10 flex-1 rounded-lg" />
                          <Skeleton className="h-10 w-32 rounded-lg" />
                          <Skeleton className="h-10 w-10 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <Skeleton className="h-5 w-44 mb-3" />
                    <Skeleton className="h-24 w-full rounded-lg border-2 border-dashed" />
                  </div>

                  {/* Submit button */}
                  <div className="flex gap-3 pt-6 border-t border-gray-200">
                    <Skeleton className="h-12 w-24 rounded-lg" />
                    <Skeleton className="h-12 flex-1 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Job details */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                  <Skeleton className="h-6 w-28 mb-4" />
                  <div>
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                  <div className="flex gap-2">
                    <SkeletonBadge />
                    <SkeletonBadge />
                  </div>
                  <div className="border-t pt-4">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </div>

              {/* Tips card */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <div className="animate-pulse">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
