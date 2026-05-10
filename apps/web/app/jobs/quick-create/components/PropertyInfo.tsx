'use client';

import { Home as HomeIcon } from 'lucide-react';

export interface PrimaryProperty {
  id: string;
  property_name?: string;
  address?: string;
  street_address?: string;
  city?: string;
  postcode?: string;
}

interface Props {
  primaryProperty: PrimaryProperty | null;
  propertiesLoading: boolean;
  propertiesError: string | null;
  onRetry: () => void;
}

/**
 * Three-state property block (loading / error / loaded).
 * Extracted from `quick-create/page.tsx` on 2026-05-09 for
 * AUDIT_PUNCH_LIST P2 #41. The error state surfaces a Retry button
 * that calls `fetchProperties` from the parent.
 */
export function PropertyInfo({
  primaryProperty,
  propertiesLoading,
  propertiesError,
  onRetry,
}: Props) {
  if (propertiesLoading) {
    return (
      <div className='bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6'>
        <div className='flex items-center gap-3 text-gray-600'>
          <div className='w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
          <p>Loading your property…</p>
        </div>
      </div>
    );
  }

  if (propertiesError && !primaryProperty) {
    return (
      <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <p className='text-amber-900'>{propertiesError}</p>
          <button
            type='button'
            onClick={onRetry}
            className='shrink-0 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium rounded-lg transition-colors'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (primaryProperty) {
    return (
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6'>
        <div className='flex items-center gap-3'>
          <HomeIcon className='w-5 h-5 text-blue-600' />
          <div>
            <p className='text-sm text-blue-600 font-medium'>Property</p>
            <p className='text-gray-900'>
              {primaryProperty.property_name || 'Your Property'}
            </p>
            <p className='text-sm text-gray-600'>{primaryProperty.address}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
