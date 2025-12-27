import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function EditJobLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-100 rounded" />
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* Title field */}
            <div className="mb-6">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-10 w-full bg-gray-100 rounded" />
            </div>

            {/* Description field */}
            <div className="mb-6">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-32 w-full bg-gray-100 rounded" />
            </div>

            {/* Category & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-full bg-gray-100 rounded" />
              </div>
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-full bg-gray-100 rounded" />
              </div>
            </div>

            {/* Date fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-full bg-gray-100 rounded" />
              </div>
              <div>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-10 w-full bg-gray-100 rounded" />
              </div>
            </div>

            {/* Images section */}
            <div className="mb-6">
              <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <div className="h-10 w-24 bg-gray-100 rounded-lg" />
              <div className="h-10 w-32 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
