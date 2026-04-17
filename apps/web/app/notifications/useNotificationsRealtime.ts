'use client';

/**
 * useNotificationsRealtime — live Supabase Realtime subscription for the
 * notifications inbox. Extracted from page.tsx so the main component stays
 * under the 500-line pre-commit limit.
 *
 * Audit 2026-04-16 P2 #13 — replaces the old "fetch once on mount" pattern
 * with live INSERT/UPDATE/DELETE propagation.
 */

import { useRealtime } from '@/hooks/useRealtime';

export interface InboxNotification {
  id: string;
  type: 'job' | 'bid' | 'message' | 'payment' | 'system';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

type Setter = React.Dispatch<React.SetStateAction<InboxNotification[]>>;

export function useNotificationsRealtime(
  userId: string | null | undefined,
  setNotifications: Setter
): void {
  useRealtime(
    userId
      ? {
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
          onInsert: (payload) => {
            const row = payload.new as Record<string, unknown>;
            const next: InboxNotification = {
              id: String(row.id),
              type: (row.type as InboxNotification['type']) || 'system',
              title: (row.title as string) || 'Notification',
              message: (row.message as string) || '',
              created_at:
                (row.created_at as string) || new Date().toISOString(),
              is_read: Boolean(row.read ?? row.is_read ?? false),
              action_url: (row.action_url as string) || undefined,
              metadata: (row.metadata as Record<string, unknown>) || undefined,
            };
            setNotifications((prev) =>
              prev.some((n) => n.id === next.id) ? prev : [next, ...prev]
            );
          },
          onUpdate: (payload) => {
            const row = payload.new as Record<string, unknown>;
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === String(row.id)
                  ? {
                      ...n,
                      is_read: Boolean(row.read ?? row.is_read ?? n.is_read),
                      title: (row.title as string) || n.title,
                      message: (row.message as string) || n.message,
                    }
                  : n
              )
            );
          },
          onDelete: (payload) => {
            const row = payload.old as Record<string, unknown>;
            setNotifications((prev) =>
              prev.filter((n) => n.id !== String(row.id))
            );
          },
        }
      : undefined
  );
}
