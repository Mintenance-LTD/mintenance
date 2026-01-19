'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
// Loading skeleton that matches the profile layout
function ProfileLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        {/* Content sections skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
// Lazy load the heavy profile component
export const ContractorProfileLazy = dynamic(
  () => import('./ContractorProfileClient2025').then(mod => ({
    default: mod.ContractorProfileClient2025
  })),
  {
    loading: () => <ProfileLoadingSkeleton />,
    ssr: false, // Disable SSR for this heavy client component
  }
);
export default ContractorProfileLazy;