/**
 * Settings Page Loading State
 *
 * Displays skeleton loaders while settings data is being fetched.
 * Maintains consistent layout to prevent content jumping.
 */

import Skeleton, { SkeletonGroup  } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <nav className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Section Header */}
            <div className="border-b border-gray-200 pb-4 mb-6">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Profile Section */}
              <div>
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormFieldSkeleton label="First Name" />
                  <FormFieldSkeleton label="Last Name" />
                  <FormFieldSkeleton label="Email" />
                  <FormFieldSkeleton label="Phone" />
                </div>
              </div>

              {/* Address Section */}
              <div className="border-t border-gray-100 pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormFieldSkeleton label="Street Address" fullWidth />
                  <FormFieldSkeleton label="City" />
                  <FormFieldSkeleton label="County" />
                  <FormFieldSkeleton label="Postcode" />
                  <FormFieldSkeleton label="Country" />
                </div>
              </div>

              {/* Preferences Section */}
              <div className="border-t border-gray-100 pt-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-4">
                  <ToggleSkeleton label="Email Notifications" />
                  <ToggleSkeleton label="SMS Notifications" />
                  <ToggleSkeleton label="Push Notifications" />
                  <ToggleSkeleton label="Marketing Emails" />
                </div>
              </div>

              {/* Security Section */}
              <div className="border-t border-gray-100 pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Skeleton className="h-5 w-40 mb-1" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Form Field Skeleton Component
 */
function FormFieldSkeleton({ label, fullWidth = false }: { label?: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

/**
 * Toggle Switch Skeleton Component
 */
function ToggleSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  );
}