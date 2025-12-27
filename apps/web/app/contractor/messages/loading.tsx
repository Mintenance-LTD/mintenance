import { MessageSkeleton } from '@/components/skeletons/MessageSkeleton';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';

export default function ContractorMessagesLoading() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversations list */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 animate-pulse">
          <Skeleton className="h-8 w-32 mb-3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 animate-pulse">
          <Skeleton className="h-10 w-24 rounded-t-lg mr-2" />
          <Skeleton className="h-10 w-24 rounded-t-lg" />
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100 animate-pulse hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <SkeletonAvatar size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main area - Empty state or conversation */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center animate-pulse">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>
      </div>
    </div>
  );
}
