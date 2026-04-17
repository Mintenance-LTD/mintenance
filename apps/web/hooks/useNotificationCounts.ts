'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger } from '@mintenance/shared';
import { apiClient, type ApiClientError } from '@/lib/api/browser-client';

interface NotificationCounts {
  messages: number;
  connections?: number;
  quoteRequests?: number;
  bids?: number;
  quotes?: number;
}

interface NotificationCountsResponse {
  success?: boolean;
  counts?: NotificationCounts;
}

const EMPTY_COUNTS: NotificationCounts = { messages: 0 };

// Sprint 7 (5.3): routed through the central apiClient so CSRF / retries
// behave consistently with other client-side calls. 401 is treated as
// "user not signed in, show empty" rather than an error, matching the
// prior behavior.
async function fetchNotificationCounts(): Promise<NotificationCounts> {
  try {
    const data = await apiClient.get<NotificationCountsResponse>(
      '/api/notifications/counts'
    );
    if (data?.success && data.counts) {
      return data.counts;
    }
    return EMPTY_COUNTS;
  } catch (err) {
    if ((err as ApiClientError)?.status === 401) {
      return EMPTY_COUNTS;
    }
    throw err;
  }
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
