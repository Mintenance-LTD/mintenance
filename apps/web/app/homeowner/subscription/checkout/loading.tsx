import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';

export default function SubscriptionCheckoutLoading() {
  return (
    <div className='max-w-2xl mx-auto px-4 py-8'>
      <Skeleton className='h-9 w-48 mb-6' />
      <div className='bg-white rounded-2xl border border-gray-200 p-6'>
        <Skeleton className='h-6 w-40 mb-4' />
        <SkeletonText lines={3} className='mb-6' />
        <Skeleton className='h-12 w-full rounded-xl mb-3' />
        <Skeleton className='h-12 w-full rounded-xl mb-6' />
        <Skeleton className='h-11 w-full rounded-xl' />
      </div>
    </div>
  );
}
