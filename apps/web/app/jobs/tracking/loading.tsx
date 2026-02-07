export default function JobTrackingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 bg-gray-900" />

      <main className="p-6 sm:p-8">
        {/* Title section */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-96 bg-gray-100 rounded" />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Job list */}
          <div>
            <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded mb-2" />
                  <div className="h-6 w-20 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Job details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-gray-200 rounded-full" />
                <div>
                  <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex justify-between mb-1">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-4 w-8 bg-gray-200 rounded" />
              </div>
              <div className="h-2.5 w-full bg-gray-200 rounded-full" />
            </div>

            {/* Timeline and updates */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-6 w-6 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-16 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
                        <div className="h-3 w-1/2 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
