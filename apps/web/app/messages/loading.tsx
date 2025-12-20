export default function MessagesLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="w-[240px] bg-gray-800 animate-pulse" />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Header skeleton */}
        <div className="h-16 bg-gray-900 animate-pulse" />

        <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <div className="animate-pulse">
            {/* Title */}
            <div className="h-8 w-48 bg-gray-200 rounded mb-6" />

            {/* Messages list */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 bg-gray-200 rounded" />
                      <div className="h-4 w-20 bg-gray-100 rounded" />
                    </div>
                    <div className="h-4 w-full bg-gray-100 rounded" />
                    <div className="h-4 w-2/3 bg-gray-100 rounded" />
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

