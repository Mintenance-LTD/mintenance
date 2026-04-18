'use client';

import { useEffect } from 'react';

export default function RetentionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Retention dashboard error', error);
  }, [error]);

  return (
    <div className='p-6'>
      <h1 className='text-xl font-bold text-rose-700 mb-2'>
        Retention dashboard failed to load
      </h1>
      <p className='text-sm text-gray-600 mb-4'>
        {error.message || 'Unknown error'}
      </p>
      <button
        onClick={reset}
        className='bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold'
      >
        Retry
      </button>
    </div>
  );
}
