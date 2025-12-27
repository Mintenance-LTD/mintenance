import Skeleton, { SkeletonAvatar, SkeletonText, SkeletonBadge } from '@/components/ui/Skeleton';

export default function ContractorProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Cover image */}
            <div className="h-48 bg-gray-200 animate-pulse" />

            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative -mt-20">
                  <SkeletonAvatar size="xl" className="h-32 w-32 border-4 border-white" />
                </div>
                <div className="flex-1 pt-2">
                  <div className="animate-pulse space-y-3">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-48" />
                    <div className="flex gap-2">
                      <SkeletonBadge />
                      <SkeletonBadge />
                      <SkeletonBadge />
                    </div>
                  </div>
                </div>
                <div className="animate-pulse">
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-24 mb-4" />
                <SkeletonText lines={5} />
              </div>

              {/* Skills */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonBadge key={i} />
                  ))}
                </div>
              </div>

              {/* Portfolio */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-28 mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="animate-pulse mb-6">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-8 w-48" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4 last:border-0 animate-pulse">
                      <div className="flex items-start gap-3 mb-2">
                        <SkeletonAvatar size="sm" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <SkeletonText lines={2} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
