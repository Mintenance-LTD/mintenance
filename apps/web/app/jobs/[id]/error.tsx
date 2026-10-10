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
        logger.error('Job Detail Page Error', error);
    }, [error]);

    return (
        <div style={{ padding: '40px' }}>
            <ErrorView
                title="Failed to load job details"
                message='We could not load this job. Please try again. If the problem continues, contact support.'
                onRetry={reset}
                variant="card"
            />
        </div>
    );
}
