'use client';

import { Skeleton, SkeletonAvatar, SkeletonText } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface MessageSkeletonProps {
  className?: string;
  variant?: 'chat' | 'list' | 'thread';
}

export function MessageSkeleton({ className, variant = 'chat' }: MessageSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className={cn('flex items-start gap-3 p-4 border-b border-gray-100', className)}>
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'thread') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Received message */}
        <div className="flex gap-3">
          <SkeletonAvatar size="sm" />
          <div className="max-w-[70%]">
            <Skeleton className="h-4 w-24 mb-2" />
            <div className="bg-gray-100 rounded-lg rounded-tl-none p-3">
              <SkeletonText lines={2} />
            </div>
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>

        {/* Sent message */}
        <div className="flex gap-3 justify-end">
          <div className="max-w-[70%]">
            <div className="bg-blue-50 rounded-lg rounded-tr-none p-3">
              <SkeletonText lines={1} />
            </div>
            <Skeleton className="h-3 w-16 mt-1 ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Default chat variant
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('flex gap-3', i % 2 === 1 && 'justify-end')}>
            {i % 2 === 0 && <SkeletonAvatar size="sm" />}
            <div className="max-w-[60%]">
              <div className={cn(
                'rounded-lg p-3',
                i % 2 === 0 ? 'bg-gray-100 rounded-tl-none' : 'bg-blue-50 rounded-tr-none'
              )}>
                <SkeletonText lines={i % 3 === 0 ? 2 : 1} />
              </div>
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} variant="list" />
      ))}
    </div>
  );
}