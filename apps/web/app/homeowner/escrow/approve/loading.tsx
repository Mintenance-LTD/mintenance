import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';

export default function HomeownerEscrowApproveLoading() {
  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      <Skeleton className='h-9 w-64 mb-2' />
      <Skeleton className='h-5 w-96 mb-8' />
      <div className='bg-white rounded-xl border border-gray-200 p-6'>
        <Skeleton className='h-6 w-48 mb-4' />
        <SkeletonText lines={3} className='mb-6' />
        <div className='grid grid-cols-2 gap-4 mb-6'>
          <Skeleton className='h-48 w-full rounded-lg' />
          <Skeleton className='h-48 w-full rounded-lg' />
        </div>
        <div className='flex gap-3'>
          <Skeleton className='h-11 w-40 rounded-lg' />
          <Skeleton className='h-11 w-40 rounded-lg' />
        </div>
      </div>
    </div>
  );
}
