'use client';

import { useRealtime } from '@/hooks/useRealtime';

/** Reload the server's grouped and state-checked rows after inbox changes. */
export function useNotificationsRealtime(
  userId: string | undefined,
  refresh: () => void
) {
  useRealtime(
    userId
      ? {
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
          onInsert: refresh,
          onUpdate: refresh,
          onDelete: refresh,
        }
      : undefined
  );
}
