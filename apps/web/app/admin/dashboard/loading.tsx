export default function DashboardLoading() {
  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto'>
      {/* Hero skeleton */}
      <section className='mb-10'>
        <div className='h-10 w-80 bg-gray-200 rounded animate-pulse mb-3' />
        <div className='h-5 w-96 bg-gray-100 rounded animate-pulse' />

        {/* Bento stats grid skeleton */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-5 mt-8'>
          <div className='md:col-span-2 bg-white/70 backdrop-blur-sm rounded-xl p-7 min-h-[180px] animate-pulse border border-gray-100' />
          <div className='bg-white rounded-xl p-6 min-h-[120px] animate-pulse shadow-sm' />
          <div className='bg-white rounded-xl p-6 min-h-[120px] animate-pulse shadow-sm' />
          <div className='bg-white rounded-xl p-6 min-h-[120px] animate-pulse shadow-sm' />
        </div>
      </section>

      {/* 12-col layout skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-7'>
        <div className='lg:col-span-8 space-y-7'>
          <div className='bg-white rounded-xl p-7 h-[340px] animate-pulse shadow-sm' />
          <div className='bg-white rounded-xl p-7 h-[200px] animate-pulse shadow-sm' />
        </div>
        <div className='lg:col-span-4 space-y-7'>
          <div className='bg-[#0b0f10] rounded-xl p-7 h-[220px] animate-pulse' />
          <div className='bg-white rounded-xl p-7 h-[160px] animate-pulse shadow-sm' />
          <div className='bg-white rounded-xl p-7 h-[200px] animate-pulse shadow-sm' />
        </div>
      </div>
    </div>
  );
}
