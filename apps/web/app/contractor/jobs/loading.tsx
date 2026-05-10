import Skeleton from '@/components/ui/Skeleton';

/**
 * Loading skeleton for /contractor/jobs.
 * Mirrors `page.tsx` (post-split): hero KPI grid → filter chips →
 * job card list. Added 2026-05-10 (AUDIT_PUNCH_LIST P3 #81).
 */
export default function ContractorJobsLoading() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Hero — title + 4-stat KPI grid */}
        <div className='mb-8'>
          <Skeleton className='h-9 w-64 mb-2' />
          <Skeleton className='h-5 w-96 mb-6' />
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='bg-white rounded-lg border border-gray-200 p-4'
              >
                <Skeleton className='h-4 w-20 mb-2' />
                <Skeleton className='h-8 w-24' />
              </div>
            ))}
          </div>
        </div>

        {/* Filter row */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 mb-6'>
          <div className='flex flex-wrap gap-2 mb-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-9 w-24 rounded-full' />
            ))}
          </div>
          <div className='flex flex-wrap gap-2'>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className='h-7 w-20 rounded-full' />
            ))}
          </div>
        </div>

        {/* Job cards */}
        <div className='space-y-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='bg-white rounded-lg border border-gray-200 p-6'
            >
              <div className='flex items-start justify-between mb-3'>
                <div className='flex-1'>
                  <Skeleton className='h-6 w-3/4 mb-2' />
                  <Skeleton className='h-4 w-1/2' />
                </div>
                <Skeleton className='h-7 w-20 rounded-full' />
              </div>
              <Skeleton className='h-4 w-full mb-2' />
              <Skeleton className='h-4 w-2/3 mb-4' />
              <div className='flex items-center justify-between'>
                <Skeleton className='h-5 w-32' />
                <Skeleton className='h-9 w-24 rounded-lg' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
