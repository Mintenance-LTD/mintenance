import { Skeleton, SkeletonText, SkeletonBadge, SkeletonAvatar } from '@/components/ui/Skeleton';

export default function ContractorJobDetailsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job header */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <div className="flex items-center gap-3">
                      <SkeletonBadge />
                      <SkeletonBadge />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100">
                  <div>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>

                <div className="mt-4">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <SkeletonText lines={4} />
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-5 w-20 mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-5 w-24 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Homeowner card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-5 w-24 mb-4" />
                <div className="flex items-center gap-3 mb-4">
                  <SkeletonAvatar size="lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <Skeleton className="h-5 w-20 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
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
