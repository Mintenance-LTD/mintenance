import { Skeleton, SkeletonAvatar, SkeletonText, SkeletonBadge } from '@/components/ui/Skeleton';

export default function DisputeDetailsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between animate-pulse">
              <div className="flex-1">
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-5 w-48 mb-3" />
                <div className="flex gap-2">
                  <SkeletonBadge />
                  <SkeletonBadge />
                </div>
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dispute details */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-4" />
                <SkeletonText lines={5} />
              </div>

              {/* Evidence */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-28 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-video bg-gray-100 rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-6 w-24 mb-6 animate-pulse" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200" />
                        {i < 3 && <div className="w-0.5 h-16 bg-gray-200 mt-2" />}
                      </div>
                      <div className="flex-1 pb-8">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-32 mb-2" />
                        <SkeletonText lines={2} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Parties involved */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <div className="flex items-center gap-3">
                        <SkeletonAvatar size="md" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job details */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-28 mb-4" />
                <div className="space-y-3">
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-5 w-20" />
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
