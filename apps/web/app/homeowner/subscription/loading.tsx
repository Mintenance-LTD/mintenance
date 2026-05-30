import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';

export default function HomeownerSubscriptionLoading() {
  return (
    <div className='max-w-4xl mx-auto px-4 py-8'>
      <Skeleton className='h-9 w-56 mb-2' />
      <Skeleton className='h-5 w-80 mb-8' />
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className='bg-white rounded-2xl border border-gray-200 p-6'
          >
            <Skeleton className='h-6 w-32 mb-3' />
            <Skeleton className='h-8 w-24 mb-4' />
            <SkeletonText lines={4} className='mb-6' />
            <Skeleton className='h-11 w-full rounded-xl' />
          </div>
        ))}
      </div>
    </div>
  );
}
