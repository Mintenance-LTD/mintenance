/**
 * Notification CRUD operations.
 *
 * Extracted from NotificationService.ts to keep it under the 500-line limit.
 * Read operations use direct Supabase queries; writes use mobileApiClient for server-side orchestration.
 */

import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import type { NotificationData } from './types';

/**
 * Fetch user notifications via the web API, with a direct Supabase fallback.
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationData[]> {
  try {
    if (offset === 0) {
      try {
        // history=1 — request the paginated, unfiltered inbox view.
        // Without it the API returns the dashboard-style feed (recent
        // OR unread, capped at 7) and the mobile inbox looks empty for
        // users whose recent activity is already read.
        //
        // 2026-05-01 audit follow-up (review pass 4): the response
        // shape now carries `metadata` — the canonical jsonb column.
        // Older builds may still see `data` (the legacy column name);
        // we read metadata first, then data for backwards compat with
        // any not-yet-redeployed instance, then fall back to deriving
        // an actionUrl wrapper for very old payloads.
        const response = await mobileApiClient.get<{
          notifications?: Array<{
            id: string;
            title?: string;
            message?: string;
            body?: string;
            type?: NotificationData['type'];
            priority?: NotificationData['priority'];
            read?: boolean;
            created_at?: string;
            createdAt?: string;
            metadata?: Record<string, unknown> | null;
            data?: unknown;
            link?: string;
            action_url?: string;
          }>;
        }>(`/api/notifications?history=1&limit=${limit}&offset=${offset}`);

        if (response.notifications) {
          return response.notifications.map((row) => ({
            id: row.id,
            title: row.title || 'Notification',
            body: row.message || row.body || '',
            data:
              row.metadata ??
              row.data ??
              (row.action_url || row.link
                ? { actionUrl: row.action_url || row.link }
                : undefined),
            type: row.type || 'system',
            priority: row.priority || 'normal',
            userId,
            createdAt:
              row.created_at || row.createdAt || new Date().toISOString(),
            read: Boolean(row.read),
          }));
        }
      } catch (apiError) {
        logger.warn('Notification API feed unavailable, falling back to DB', {
          error: apiError,
        });
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get user notifications', error.message);
      throw new Error(error.message);
    }

    return (data ?? []).map((row: Record<string, unknown>) => {
      // 2026-05-26 audit-62 P2: previously passed row.action_url
      // through as a raw string when metadata/data were null —
      // notificationRoutingTable.normalizePayload() expects an
      // object with keys like {actionUrl, action_url, jobId, ...},
      // so a bare URL string normalised to {} and the tap fell
      // back to the inbox. Wrap the URL into the object shape the
      // router understands so the parseActionUrl() fallback path
      // can extract the jobId / conversationId.
      const rawMetadata = row.metadata as Record<string, unknown> | null;
      const rawData = row.data as Record<string, unknown> | null;
      const rawActionUrl = row.action_url as string | null;
      let normalizedData: unknown = rawMetadata ?? rawData ?? null;
      if (rawActionUrl) {
        // If we already have an object, fold the URL in; if not,
        // synthesise one. normalizePayload reads action_url and
        // actionUrl interchangeably.
        if (
          normalizedData &&
          typeof normalizedData === 'object' &&
          !Array.isArray(normalizedData)
        ) {
          normalizedData = {
            ...(normalizedData as Record<string, unknown>),
            action_url: rawActionUrl,
          };
        } else {
          normalizedData = { action_url: rawActionUrl };
        }
      }
      return {
        id: row.id as string,
        title: row.title as string,
        body: (row.message as string) || '',
        data: normalizedData,
        type: row.type as string,
        priority: (row.priority as string) || 'normal',
        userId,
        createdAt: row.created_at as string,
        read: row.read as boolean,
      };
    }) as unknown as NotificationData[];
  } catch (error) {
    logger.error('Failed to get user notifications', error);
    throw error;
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await mobileApiClient.post(`/api/notifications/${notificationId}/read`);
  } catch (error) {
    logger.error('Failed to mark notification as read', error);
    throw error;
  }
}

export async function markAllAsRead(_userId: string): Promise<void> {
  try {
    await mobileApiClient.post('/api/notifications/mark-all-read');
  } catch (error) {
    logger.error('Failed to mark all notifications as read', error);
    throw error;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('Failed to get unread count', error.message);
      throw new Error(error.message);
    }

    return count || 0;
  } catch (error) {
    logger.error('Failed to get unread count', error);
    return 0;
  }
}

export async function saveNotification(
  notification: Omit<NotificationData, 'id' | 'createdAt'>
): Promise<void> {
  try {
    await mobileApiClient.post('/api/notifications', {
      title: notification.title,
      message: notification.body,
      data: notification.data,
      type: notification.type,
      priority: notification.priority,
      user_id: notification.userId,
      read: notification.read,
    });
  } catch (error) {
    logger.error('Failed to save notification', error);
    throw error;
  }
}
