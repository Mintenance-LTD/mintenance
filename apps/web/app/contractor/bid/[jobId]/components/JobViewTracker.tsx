'use client';

import { useEffect } from 'react';

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
          console.error('Failed to track job view');
        } else {
          const data = await response.json();
          // console.log('Job view tracked:', data);
        }
      } catch (error) {
        console.error('Error tracking job view:', error);
      }
    };

    trackJobView();
  }, [jobId]);

  return null; // This component doesn't render anything
}