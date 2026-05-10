import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for the public contractor profile route.
 * Mirrors the structure of `page.tsx`: header → profile hero +
 * stats → skills chips → reviews → portfolio grid.
 *
 * Added 2026-05-10 (AUDIT_PUNCH_LIST P3 #81).
 */
export default function ContractorPublicProfileLoading() {
  return (
    <main className='min-h-screen bg-gray-50'>
      {/* Top header — Logo + back/post-job nav */}
      <div className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between'>
          <Skeleton className='h-8 w-40' />
          <div className='flex items-center gap-4'>
            <Skeleton className='h-5 w-32' />
            <Skeleton className='h-5 w-24' />
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Profile hero card */}
        <div className='bg-white rounded-lg border border-gray-200 p-8 mb-6'>
          <div className='flex items-center gap-6'>
            <Skeleton className='h-32 w-32 rounded-full' />
            <div className='flex-1'>
              <Skeleton className='h-8 w-1/2 mb-2' />
              <Skeleton className='h-5 w-1/3 mb-4' />
              <SkeletonText lines={2} />
              <Skeleton className='h-7 w-32 rounded-full mt-4' />
            </div>
            <Skeleton className='h-12 w-44 rounded-lg' />
          </div>
        </div>

        {/* Stats grid (jobs completed + avg rating) */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='bg-white rounded-lg border border-gray-200 p-6 text-center'
            >
              <Skeleton className='h-10 w-20 mx-auto mb-2' />
              <Skeleton className='h-4 w-32 mx-auto' />
            </div>
          ))}
        </div>

        {/* Skills chips */}
        <div className='bg-white rounded-lg border border-gray-200 p-6 mb-8'>
          <Skeleton className='h-6 w-40 mb-4' />
          <div className='flex flex-wrap gap-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className='h-7 w-24 rounded-full' />
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className='bg-white rounded-lg border border-gray-200 p-8 mb-8'>
          <Skeleton className='h-7 w-32 mb-6' />
          <div className='space-y-6'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className='border border-gray-200 rounded-lg p-6 bg-gray-50'
              >
                <div className='flex items-center gap-4 mb-4'>
                  <Skeleton className='h-12 w-12 rounded-full' />
                  <div className='flex-1'>
                    <Skeleton className='h-5 w-32 mb-1' />
                    <Skeleton className='h-3 w-24' />
                  </div>
                  <Skeleton className='h-5 w-12' />
                </div>
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio grid */}
        <div className='bg-white rounded-lg border border-gray-200 p-8'>
          <Skeleton className='h-7 w-32 mb-6' />
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className='aspect-square rounded-lg' />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
