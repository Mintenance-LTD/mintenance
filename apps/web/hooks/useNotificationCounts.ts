'use client';

import { useEffect, useState } from 'react';

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
        throw new Error('Failed to fetch notification counts');
      }

      const data = await response.json();
      setCounts(data.counts || {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Failed to fetch notification counts:', err);
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
