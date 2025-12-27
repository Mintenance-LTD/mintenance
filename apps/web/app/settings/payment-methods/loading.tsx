/**
 * Payment Methods Loading State
 *
 * Displays skeleton loaders while payment method data is being fetched.
 * Ensures secure-looking UI during sensitive data operations.
 */

import Skeleton, { SkeletonGroup  } from '@/components/ui/Skeleton';

export default function PaymentMethodsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Add Payment Method Button */}
      <div className="flex justify-end mb-6">
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>

      {/* Payment Methods List */}
      <div className="space-y-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <PaymentMethodCardSkeleton key={i} isDefault={i === 0} />
        ))}
      </div>

      {/* Billing Address Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg mt-4" />
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <PaymentHistoryItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Method Card Skeleton
 */
function PaymentMethodCardSkeleton({ isDefault = false }: { isDefault?: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Card Icon */}
          <Skeleton className="h-12 w-20 rounded" />

          {/* Card Details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-5 w-32" />
              {isDefault && <Skeleton className="h-5 w-16 rounded-full" />}
            </div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Payment History Item Skeleton
 */
function PaymentHistoryItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-20 mb-1 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}