import { Skeleton } from '@/components/ui/Skeleton';

export default function QuickCreateJobLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center animate-pulse">
            <Skeleton className="h-10 w-80 mx-auto mb-2" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>

          {/* Quick create form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="animate-pulse space-y-6">
              {/* Step indicator */}
              <div className="flex justify-between mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <Skeleton className="h-10 w-10 rounded-full mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    {i < 3 && <Skeleton className="h-0.5 flex-1 mx-2" />}
                  </div>
                ))}
              </div>

              {/* Form fields */}
              <div>
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>

              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Skeleton className="h-5 w-24 mb-2" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-5 w-28 mb-2" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>

              {/* AI suggestion box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <Skeleton className="h-12 w-24 rounded-lg" />
                <Skeleton className="h-12 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
