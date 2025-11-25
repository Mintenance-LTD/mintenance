'use client';

import { useEffect } from 'react';
import { ErrorView } from '@/components/ui/ErrorView';
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

    return (
        <div style={{ padding: '40px' }}>
            <ErrorView
                title="Failed to load messages"
                message={error.message || 'An unexpected error occurred.'}
                onRetry={reset}
                variant="card"
            />
        </div>
    );
}
