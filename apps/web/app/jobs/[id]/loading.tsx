import Skeleton, { SkeletonText, SkeletonBadge, SkeletonAvatar, SkeletonImage  } from '@/components/ui/Skeleton';

export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <div className="flex items-center gap-4 mb-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <SkeletonBadge />
                    <SkeletonBadge />
                    <SkeletonBadge />
                  </div>
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <SkeletonText lines={6} />
            </div>

            {/* Photos */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonImage key={i} aspectRatio="square" />
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <Skeleton className="h-4 w-full max-w-md" />
                  </div>
                ))}
              </div>
            </div>

            {/* Bids Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>

              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <SkeletonAvatar size="md" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <Skeleton className="h-5 w-32 mb-1" />
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-12" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-24" />
                        </div>
                        <SkeletonText lines={2} className="mb-3" />
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-24 rounded-lg" />
                          <Skeleton className="h-9 w-32 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Job Details Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </div>

              {/* Homeowner Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="flex items-center gap-4 mb-4">
                  <SkeletonAvatar size="lg" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              {/* Actions Card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1 rounded-lg" />
                    <Skeleton className="h-10 flex-1 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <SkeletonText lines={2} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}