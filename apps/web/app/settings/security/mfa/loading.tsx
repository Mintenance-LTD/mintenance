/**
 * Multi-Factor Authentication Settings Loading State
 *
 * Displays skeleton loaders while MFA settings are being fetched.
 * Maintains security-conscious UI appearance during loading.
 */

import Skeleton, { SkeletonGroup, SkeletonText  } from '@/components/ui/Skeleton';

export default function MFASettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      {/* Security Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      {/* MFA Methods */}
      <div className="space-y-6">
        {/* Authenticator App */}
        <MFAMethodSkeleton
          title="Authenticator App"
          description="Use an authenticator app like Google Authenticator or Authy"
        />

        {/* SMS Authentication */}
        <MFAMethodSkeleton
          title="SMS Authentication"
          description="Receive verification codes via text message"
        />

        {/* Backup Codes */}
        <MFAMethodSkeleton
          title="Backup Codes"
          description="Generate one-time use codes for emergency access"
        />

        {/* Security Keys */}
        <MFAMethodSkeleton
          title="Security Keys"
          description="Use a physical security key for authentication"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SecurityActivitySkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * MFA Method Card Skeleton
 */
function MFAMethodSkeleton({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-full max-w-md mb-4" />

          {/* Status Badge */}
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Toggle/Action */}
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>

      {/* Expandable Content Area */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <SkeletonGroup gap="sm">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </SkeletonGroup>
      </div>
    </div>
  );
}

/**
 * Security Activity Item Skeleton
 */
function SecurityActivitySkeleton() {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div>
          <Skeleton className="h-4 w-48 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-3 w-24" />
    </div>
  );
}