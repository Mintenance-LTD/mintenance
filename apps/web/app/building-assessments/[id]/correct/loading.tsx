import { Skeleton } from '@/components/ui/Skeleton';

export default function CorrectAssessmentLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
            <Skeleton className="h-8 w-96 mb-2" />
            <Skeleton className="h-5 w-[500px]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original assessment */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-100 p-4 border-b border-gray-200 animate-pulse">
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="p-6 animate-pulse">
                {/* Image */}
                <div className="aspect-video bg-gray-200 rounded-lg mb-4" />

                {/* AI predictions */}
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-2 mb-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>

                <Skeleton className="h-5 w-28 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Correction form */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-100 p-4 border-b border-green-200 animate-pulse">
                <Skeleton className="h-6 w-56" />
              </div>
              <div className="p-6 animate-pulse space-y-6">
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>

                <div>
                  <Skeleton className="h-5 w-28 mb-2" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>

                <div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>

                <div>
                  <Skeleton className="h-5 w-40 mb-2" />
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <Skeleton className="h-12 w-24 rounded-lg" />
                  <Skeleton className="h-12 flex-1 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
