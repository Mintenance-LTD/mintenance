'use client';

import { useEffect, useState } from 'react';
import { ErrorView } from '@/components/ui/ErrorView';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { MintEditorialErrorView } from '@/components/mint-editorial/MintEditorialErrorView';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Messages Page Error', error);
  }, [error]);

  // Hydration-safe theme detection so the route-level boundary picks
  // up the canonical Mint Editorial error surface when the cookie is on.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      {isMintEditorial ? (
        <MintEditorialErrorView
          code='500'
          title='Failed to load messages.'
          body={error.message || 'Our end. Try again in a minute.'}
          primary={{ label: 'Try again', onClick: reset }}
        />
      ) : (
        <div style={{ padding: '40px' }}>
          <ErrorView
            title='Failed to load messages'
            message={error.message || 'An unexpected error occurred.'}
            onRetry={reset}
            variant='card'
          />
        </div>
      )}
    </HomeownerPageWrapper>
  );
}
