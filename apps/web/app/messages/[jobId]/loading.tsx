import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';

export default function MessageThreadLoading() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Messages list */}
      <div className="w-80 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 animate-pulse">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-gray-100 animate-pulse">
              <div className="flex items-start gap-3">
                <SkeletonAvatar size="md" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main conversation area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
              <div className={`max-w-md ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'} rounded-lg p-4`}>
                <Skeleton className="h-4 w-64 mb-2" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-200 p-4 animate-pulse">
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
