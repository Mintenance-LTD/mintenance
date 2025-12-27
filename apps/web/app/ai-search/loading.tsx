import { Skeleton } from '@/components/ui/Skeleton';

export default function AISearchLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center animate-pulse">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-[500px] mx-auto" />
          </div>

          {/* Search box */}
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
            <Skeleton className="h-16 w-full rounded-xl mb-4" />
            <div className="flex justify-end">
              <Skeleton className="h-12 w-40 rounded-lg" />
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="animate-pulse">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent searches */}
          <div className="animate-pulse">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
