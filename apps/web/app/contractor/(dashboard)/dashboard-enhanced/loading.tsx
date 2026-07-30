export default function ContractorDashboardLoading() {
  return (
    <div className='min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header skeleton */}
        <div className='animate-pulse'>
          <div className='h-9 w-72 bg-gray-200 rounded mb-2' />
          <div className='h-4 w-96 bg-gray-100 rounded' />
        </div>

        {/* KPI grid skeleton — 4 cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm animate-pulse'
            >
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-10 h-10 bg-gray-200 rounded-lg' />
                <div className='h-3 w-20 bg-gray-200 rounded' />
              </div>
              <div className='h-8 w-32 bg-gray-200 rounded mb-2' />
              <div className='h-3 w-24 bg-gray-100 rounded' />
            </div>
          ))}
        </div>

        {/* Two-column main area skeleton */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left: jobs/activity */}
          <div className='lg:col-span-2 space-y-6'>
            <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
              <div className='h-6 w-44 bg-gray-200 rounded mb-4' />
              <div className='space-y-3'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className='flex items-center gap-4 p-3 rounded-lg border border-gray-100'
                  >
                    <div className='h-12 w-12 bg-gray-200 rounded-lg' />
                    <div className='flex-1 space-y-2'>
                      <div className='h-4 w-3/4 bg-gray-200 rounded' />
                      <div className='h-3 w-1/2 bg-gray-100 rounded' />
                    </div>
                    <div className='h-5 w-16 bg-gray-200 rounded' />
                  </div>
                ))}
              </div>
            </div>

            <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
              <div className='h-6 w-40 bg-gray-200 rounded mb-4' />
              <div className='h-48 bg-gray-100 rounded' />
            </div>
          </div>

          {/* Right: schedule / earnings */}
          <div className='space-y-6'>
            <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
              <div className='h-6 w-32 bg-gray-200 rounded mb-4' />
              <div className='space-y-3'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className='space-y-2'>
                    <div className='h-4 w-3/4 bg-gray-200 rounded' />
                    <div className='h-3 w-1/2 bg-gray-100 rounded' />
                  </div>
                ))}
              </div>
            </div>

            <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
              <div className='h-6 w-28 bg-gray-200 rounded mb-4' />
              <div className='h-32 bg-gray-100 rounded' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
