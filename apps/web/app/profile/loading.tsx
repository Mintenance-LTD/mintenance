export default function ProfileLoading() {
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
            <div className="h-8 w-48 bg-gray-200 rounded" />

            {/* Profile card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              {/* Avatar and name */}
              <div className="flex items-center gap-6 mb-8">
                <div className="h-24 w-24 bg-gray-200 rounded-full" />
                <div className="space-y-3">
                  <div className="h-6 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-64 bg-gray-100 rounded" />
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-10 w-full bg-gray-100 rounded" />
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="mt-8">
                <div className="h-10 w-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

