export default function PaymentMethodsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Header Skeleton */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-3 rounded-xl h-14 w-14" />
                <div className="h-10 w-64 bg-white/20 rounded" />
              </div>
              <div className="h-5 w-80 bg-white/10 rounded" />
            </div>
            <div className="h-12 w-48 bg-white/20 rounded-xl" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="h-4 w-24 bg-white/20 rounded mb-2" />
                <div className="h-8 w-12 bg-white/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                <div className="text-right">
                  <div className="h-3 w-12 bg-gray-100 rounded mb-1" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="mb-6">
                <div className="h-4 w-32 bg-gray-100 rounded mb-2" />
                <div className="h-7 w-56 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
