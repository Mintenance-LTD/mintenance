'use client';

import { useEffect } from 'react';
import { logger } from '@mintenance/shared';

export function JobViewTracker({ jobId }: { jobId: string }) {
  useEffect(() => {
    // Track job view when component mounts
    const trackJobView = async () => {
      try {
        const response = await fetch('/api/contractor/job-views', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId }),
        });

        if (!response.ok) {
          logger.error('Failed to track job view', { service: 'ui' });
        } else {
          const data = await response.json();
          // logger.info('Job view tracked:', data', { service: 'ui' });
        }
      } catch (error) {
        logger.error('Error tracking job view:', error, { service: 'ui' });
      }
    };

    trackJobView();
  }, [jobId]);

  return null; // This component doesn't render anything
}