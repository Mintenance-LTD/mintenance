export default function SchedulingLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="w-[240px] bg-gray-800 animate-pulse" />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-900 animate-pulse" />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '24px',
            alignItems: 'start',
          }}>
            {/* Calendar skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="animate-pulse">
                {/* Calendar header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="h-8 w-48 bg-gray-200 rounded" />
                  <div className="flex gap-2">
                    <div className="h-10 w-20 bg-gray-200 rounded" />
                    <div className="h-10 w-10 bg-gray-200 rounded" />
                    <div className="h-10 w-10 bg-gray-200 rounded" />
                  </div>
                </div>

                {/* Days of week */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded" />
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-50 rounded border border-gray-100" />
                  ))}
                </div>
              </div>
            </div>

            {/* KPI cards skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-8 w-32 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

