export default function RevenueLoading() {
  return (
    <div className='min-h-screen bg-[#f7f9fb]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8'>
        <div className='h-12 w-80 bg-gray-200 rounded animate-pulse mb-3' />
        <div className='h-5 w-96 bg-gray-100 rounded animate-pulse mb-8' />
        {/* Bento grid skeleton */}
        <div className='grid grid-cols-12 gap-6 mb-8'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='col-span-12 md:col-span-4 bg-white rounded-[1.5rem] p-8 min-h-[160px] animate-pulse'
            />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className='bg-white rounded-[1.5rem] p-8 h-[340px] animate-pulse mb-8' />
        {/* Table skeleton */}
        <div className='bg-white rounded-[1.5rem] p-8 h-[300px] animate-pulse' />
      </div>
    </div>
  );
}
