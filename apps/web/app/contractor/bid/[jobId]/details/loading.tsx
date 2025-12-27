import { Skeleton, SkeletonText, SkeletonBadge, SkeletonAvatar } from '@/components/ui/Skeleton';

export default function BidDetailsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 animate-pulse">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between animate-pulse">
              <div className="flex-1">
                <Skeleton className="h-8 w-64 mb-3" />
                <div className="flex gap-2 mb-4">
                  <SkeletonBadge />
                  <SkeletonBadge />
                </div>
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Bid details */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-6" />
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-8 w-40" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-28" />
                  </div>
                </div>
              </div>

              {/* Proposal */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-28 mb-4" />
                <SkeletonText lines={6} />
              </div>

              {/* Materials */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-36 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-1" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Job info */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-28 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex gap-2 mt-3">
                    <SkeletonBadge />
                    <SkeletonBadge />
                  </div>
                </div>
              </div>

              {/* Homeowner */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-28 mb-4" />
                <div className="flex items-center gap-3">
                  <SkeletonAvatar size="lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
