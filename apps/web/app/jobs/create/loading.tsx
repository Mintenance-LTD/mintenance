import { Card } from '@/components/ui';

/**
 * Loading state for job creation page
 * Shows skeleton UI while page is loading
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200 mb-2" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Form Skeleton */}
        <Card className="p-6 space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-32 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Location Field */}
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Category and Urgency Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </div>

          {/* Budget Field */}
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-full md:w-64 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Skills Section */}
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
            <div className="h-32 w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <div className="h-12 w-full md:w-48 animate-pulse rounded bg-gray-200" />
          </div>
        </Card>
      </div>
    </div>
  );
}

