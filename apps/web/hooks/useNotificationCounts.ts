'use client';

import { useEffect, useState } from 'react';
import { logger } from '@mintenance/shared';

interface NotificationCounts {
  messages: number;
  connections?: number;
  quoteRequests?: number;
  bids?: number;
  quotes?: number;
}

/**
 * Hook to fetch real-time notification badge counts
 * Polls every 30 seconds for updates
 */
export function useNotificationCounts() {
  const [counts, setCounts] = useState<NotificationCounts>({
    messages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      const response = await fetch('/api/notifications/counts', {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // If unauthorized, return empty counts instead of throwing
        if (response.status === 401) {
          setCounts({ messages: 0 });
          setError(null);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch notification counts: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.counts) {
        setCounts(data.counts);
        setError(null);
      } else {
        // Fallback to empty counts if response format is unexpected
        setCounts({ messages: 0 });
        setError(null);
      }
    } catch (err) {
      // Silently handle errors - don't show error to user for background polling
      setError(null);
      setCounts({ messages: 0 });
      logger.error('Failed to fetch notification counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Poll every 30 seconds
    const interval = setInterval(fetchCounts, 30000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  return {
    counts,
    loading,
    error,
    refresh: fetchCounts,
  };
}
