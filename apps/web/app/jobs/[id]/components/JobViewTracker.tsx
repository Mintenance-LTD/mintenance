'use client';

import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface JobViewTrackerProps {
  jobId: string;
}

/**
 * Component to automatically track when a contractor views a job
 * This runs silently in the background
 */
export function JobViewTracker({ jobId }: JobViewTrackerProps) {
  const { user } = useCurrentUser();

  useEffect(() => {
    // Only track views for contractors
    if (!user || user.role !== 'contractor') {
      return;
    }

    // Track view
    async function trackView() {
      try {
        await fetch(`/api/jobs/${jobId}/track-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error('Failed to track job view:', error);
      }
    }

    // Small delay to ensure user actually viewed the page
    const timeoutId = setTimeout(trackView, 1000);

    return () => clearTimeout(timeoutId);
  }, [jobId, user]);

  // This component doesn't render anything
  return null;
}

