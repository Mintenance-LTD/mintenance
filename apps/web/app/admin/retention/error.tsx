'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function RetentionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // AUDIT_PUNCH_LIST P2 #63 (A2-P2-5) — was the sole `console.*` in
    // web app code. Routed through the canonical logger so retention
    // dashboard failures land in Sentry alongside other admin errors.
    logger.error('RetentionError', 'Retention dashboard failed to load', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
    });
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
