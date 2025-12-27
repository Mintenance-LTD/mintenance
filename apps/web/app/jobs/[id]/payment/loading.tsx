import { Skeleton } from '@/components/ui/Skeleton';

export default function JobPaymentLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center animate-pulse">
            <Skeleton className="h-10 w-64 mx-auto mb-2" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>

          {/* Main payment card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* Job summary */}
            <div className="border-b border-gray-200 pb-6 mb-6 animate-pulse">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>

            {/* Payment details */}
            <div className="border-b border-gray-200 pb-6 mb-6 animate-pulse">
              <Skeleton className="h-6 w-40 mb-4" />

              <div className="space-y-4">
                {/* Card number */}
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>

                {/* Expiry and CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-12 mb-2" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                </div>

                {/* Billing address */}
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mb-6 animate-pulse">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>

            {/* Payment button */}
            <div className="animate-pulse">
              <Skeleton className="h-12 w-full rounded-lg mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>

          {/* Security notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
            <div className="flex gap-3">
              <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
