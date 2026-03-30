export default function RevenueLoading() {
  return (
    <div className='min-h-screen bg-slate-50'>
      {/* Hero header skeleton */}
      <div className='bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <div className='h-14 w-14 rounded-xl bg-white/20 animate-pulse' />
                <div className='h-10 w-64 rounded bg-white/10 animate-pulse' />
              </div>
              <div className='h-5 w-80 rounded bg-white/10 animate-pulse' />
            </div>
            <div className='w-40 h-12 bg-white/10 rounded-xl animate-pulse' />
          </div>
          {/* Metrics grid skeleton */}
          <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-8'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className='bg-white/10 rounded-xl p-4 min-h-[100px] animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
      {/* Charts skeleton */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[340px] animate-pulse' />
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[340px] animate-pulse' />
        </div>
      </div>
    </div>
  );
}
