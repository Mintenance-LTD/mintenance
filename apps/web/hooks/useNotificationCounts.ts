'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger } from '@mintenance/shared';

interface NotificationCounts {
  messages: number;
  connections?: number;
  quoteRequests?: number;
  bids?: number;
  quotes?: number;
}

const EMPTY_COUNTS: NotificationCounts = { messages: 0 };

async function fetchNotificationCounts(): Promise<NotificationCounts> {
  const response = await fetch('/api/notifications/counts', {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    // If unauthorized, return empty counts instead of throwing
    if (response.status === 401) {
      return EMPTY_COUNTS;
    }
    throw new Error(`Failed to fetch notification counts: ${response.status}`);
  }

  const data = await response.json();

  if (data.success && data.counts) {
    return data.counts as NotificationCounts;
  }

  // Fallback to empty counts if response format is unexpected
  return EMPTY_COUNTS;
}

/**
 * Hook to fetch real-time notification badge counts
 * Polls every 60 seconds for updates via React Query
 */
export function useNotificationCounts() {
  const queryClient = useQueryClient();

  const { data: counts = EMPTY_COUNTS, isLoading: loading } =
    useQuery<NotificationCounts>({
      queryKey: ['notifications', 'counts'],
      queryFn: fetchNotificationCounts,
      refetchInterval: 60000,
      // Silently swallow errors - don't show to user for background polling
      retry: false,
      meta: {
        onError: (err: unknown) => {
          logger.error('Failed to fetch notification counts:', err);
        },
      },
    });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'counts'] });
  }, [queryClient]);

  // Keep error always null to match original silent-error behavior
  const error: string | null = null;

  return {
    counts,
    loading,
    error,
    refresh,
  };
}
