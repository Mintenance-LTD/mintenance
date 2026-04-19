export default function FinancialsLoading() {
  return (
    <div className='max-w-[1440px] mx-auto p-6 flex flex-col gap-6'>
      {/* Hero header skeleton — mirrors the dark gradient hero on /financials */}
      <div className='relative overflow-hidden bg-gray-900 p-8 rounded-2xl border border-gray-800 animate-pulse'>
        <div className='flex items-start gap-4'>
          <div className='w-14 h-14 rounded-2xl bg-gray-800' />
          <div className='space-y-3 flex-1'>
            <div className='h-9 w-48 bg-gray-800 rounded' />
            <div className='h-4 w-72 bg-gray-800 rounded' />
          </div>
        </div>
      </div>

      {/* 4 billing-overview cards skeleton */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm animate-pulse'
          >
            <div className='h-3 w-24 bg-gray-200 rounded mb-3' />
            <div className='h-8 w-32 bg-gray-200 rounded' />
            <div className='h-3 w-20 bg-gray-100 rounded mt-3' />
          </div>
        ))}
      </div>

      {/* Subscriptions section skeleton */}
      <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
        <div className='h-6 w-40 bg-gray-200 rounded mb-4' />
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='p-4 rounded-lg border border-gray-200 flex justify-between items-center'
            >
              <div className='space-y-2 flex-1'>
                <div className='h-4 w-48 bg-gray-200 rounded' />
                <div className='h-3 w-32 bg-gray-100 rounded' />
              </div>
              <div className='h-5 w-20 bg-gray-200 rounded' />
            </div>
          ))}
        </div>
      </div>

      {/* Invoices section skeleton */}
      <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
        <div className='h-6 w-32 bg-gray-200 rounded mb-4' />
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='p-4 rounded-lg border border-gray-200 flex justify-between items-start'
            >
              <div className='space-y-2 flex-1'>
                <div className='h-4 w-56 bg-gray-200 rounded' />
                <div className='h-3 w-40 bg-gray-100 rounded' />
                <div className='h-3 w-32 bg-gray-100 rounded' />
              </div>
              <div className='h-5 w-20 bg-gray-200 rounded' />
            </div>
          ))}
        </div>
      </div>

      {/* Recent payments skeleton */}
      <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse'>
        <div className='h-6 w-44 bg-gray-200 rounded mb-4' />
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='p-4 rounded-lg border border-gray-200 flex justify-between items-center'
            >
              <div className='space-y-2 flex-1'>
                <div className='h-4 w-48 bg-gray-200 rounded' />
                <div className='h-3 w-36 bg-gray-100 rounded' />
              </div>
              <div className='h-5 w-20 bg-gray-200 rounded' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
