import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';

export default function HomeHealthLoading() {
  return (
    <div className='max-w-2xl mx-auto px-4 py-8'>
      <Skeleton className='h-9 w-52 mb-2' />
      <Skeleton className='h-5 w-80 mb-8' />
      <div className='bg-white rounded-2xl border border-gray-200 p-6'>
        <Skeleton className='h-6 w-44 mb-4' />
        <SkeletonText lines={5} className='mb-6' />
        <Skeleton className='h-11 w-48 rounded-xl' />
      </div>
    </div>
  );
}
