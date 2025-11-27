export default function JobsLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="w-[240px] bg-gray-800 animate-pulse" />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-900 animate-pulse" />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <div className="animate-pulse space-y-6">
            {/* Title and filters */}
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 bg-gray-200 rounded" />
              <div className="h-10 w-32 bg-gray-200 rounded" />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="h-10 w-32 bg-gray-200 rounded" />
              <div className="h-10 w-32 bg-gray-200 rounded" />
              <div className="h-10 w-32 bg-gray-200 rounded" />
            </div>

            {/* Jobs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-6 w-3/4 bg-gray-200 rounded" />
                    <div className="h-4 w-full bg-gray-100 rounded" />
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
                    <div className="flex items-center justify-between pt-3">
                      <div className="h-5 w-24 bg-gray-200 rounded" />
                      <div className="h-8 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

