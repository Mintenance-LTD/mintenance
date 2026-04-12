export default function Loading() {
  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto'>
      <div className='animate-pulse space-y-6'>
        <div className='h-12 bg-gray-200 rounded-xl w-64' />
        <div className='grid grid-cols-12 gap-6'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='col-span-3 h-32 bg-gray-200 rounded-2xl' />
          ))}
        </div>
        <div className='grid grid-cols-12 gap-6'>
          <div className='col-span-8 h-80 bg-gray-200 rounded-2xl' />
          <div className='col-span-4 h-80 bg-gray-200 rounded-2xl' />
        </div>
      </div>
    </div>
  );
}
