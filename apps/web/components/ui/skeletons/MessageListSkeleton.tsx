/**
 * MessageListSkeleton Component
 *
 * Content-shaped skeleton loader for message/conversation lists.
 * Includes avatar, sender name, message preview, and timestamp.
 *
 * @example
 * <MessageListSkeleton />
 * <MessageListSkeleton count={10} />
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Skeleton, { SkeletonAvatar, SkeletonBadge } from '../Skeleton';

export interface MessageListSkeletonProps {
  /**
   * Number of message items to render
   * @default 5
   */
  count?: number;

  /**
   * Whether to show unread badges
   * @default true
   */
  showBadges?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const SingleMessageItemSkeleton = ({
  showBadge = false,
  className,
}: {
  showBadge?: boolean;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100',
        className
      )}
      aria-busy="true"
      role="status"
    >
      {/* Avatar */}
      <SkeletonAvatar size="md" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and Time */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        {/* Message Preview */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>

        {/* Tags or Status */}
        <div className="flex items-center gap-2 mt-2">
          {showBadge && <SkeletonBadge className="w-16" />}
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>

      {/* Unread Indicator */}
      {showBadge && <Skeleton className="h-2 w-2 rounded-full" />}
    </div>
  );
};

export const MessageListSkeleton: React.FC<MessageListSkeletonProps> = ({
  count = 5,
  showBadges = true,
  className,
}) => {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Message List */}
      <div role="list">
        {Array.from({ length: count }).map((_, index) => (
          <SingleMessageItemSkeleton
            key={index}
            showBadge={showBadges && index % 3 === 0}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center p-4 border-t border-gray-200">
        <Skeleton className="h-4 w-40 rounded-md" />
      </div>
    </div>
  );
};

export default MessageListSkeleton;
