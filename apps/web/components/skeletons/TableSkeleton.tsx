'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className='w-full'>
        {showHeader && (
          <thead className='bg-gray-50 border-b border-gray-200'>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className='px-6 py-3 text-left'>
                  <Skeleton className='h-4 w-24' />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className='divide-y divide-gray-200'>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className='hover:bg-gray-50'>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className='px-6 py-4'>
                  {colIndex === 0 ? (
                    <div className='flex items-center gap-3'>
                      <Skeleton className='h-8 w-8 rounded-full' />
                      <Skeleton className='h-4 w-32' />
                    </div>
                  ) : (
                    <Skeleton
                      className={cn(
                        'h-4',
                        colIndex === columns - 1 ? 'w-20' : 'w-24'
                      )}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
