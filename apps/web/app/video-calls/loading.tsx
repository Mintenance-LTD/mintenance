import { Skeleton } from '@/components/ui/Skeleton';

export default function VideoCallsLoading() {
  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center animate-pulse">
        {/* Video placeholder */}
        <div className="mb-8">
          <div className="w-[640px] h-[480px] bg-gray-800 rounded-xl mx-auto relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="h-16 w-16 rounded-full bg-gray-700" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full bg-gray-700" />
          <Skeleton className="h-14 w-14 rounded-full bg-gray-700" />
          <Skeleton className="h-14 w-14 rounded-full bg-red-600" />
          <Skeleton className="h-14 w-14 rounded-full bg-gray-700" />
        </div>

        {/* Status */}
        <div className="mt-6">
          <Skeleton className="h-5 w-64 mx-auto bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
