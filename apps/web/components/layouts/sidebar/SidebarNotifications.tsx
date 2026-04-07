'use client';

import { useCallback } from 'react';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

export function useBadgeCounts() {
  const { counts, loading: countsLoading } = useNotificationCounts();

  const getBadgeCount = useCallback(
    (badge?: 'messages' | 'notifications' | number): number | null => {
      if (typeof badge === 'number') return badge;
      if (!badge || countsLoading) return null;

      if (badge === 'messages') return counts.messages || 0;
      if (badge === 'notifications') {
        return (
          (counts.connections || 0) +
          (counts.quoteRequests || 0) +
          (counts.bids || 0)
        );
      }
      return null;
    },
    [counts, countsLoading]
  );

  return { counts, countsLoading, getBadgeCount };
}
