export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="w-[240px] bg-gray-800 animate-pulse" />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-900 animate-pulse" />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <div className="animate-pulse space-y-6">
            {/* Title */}
            <div className="h-10 w-64 bg-gray-200 rounded" />

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
                  <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>

            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
                <div className="h-64 bg-gray-100 rounded" />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
                <div className="h-64 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

