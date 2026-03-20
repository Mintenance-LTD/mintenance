/**
 * Notification CRUD operations.
 *
 * Extracted from NotificationService.ts to keep it under the 500-line limit.
 * Uses shared queries from @mintenance/data-access for consistency with web.
 */

import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import type { NotificationData } from './types';

/**
 * Fetch user notifications with web-consistent filtering.
 * Excludes social types, limits to last 24h OR unread.
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationData[]> {
  try {
    const { fetchUserNotifications } = await import('@mintenance/data-access');
    const { data, error } = await fetchUserNotifications(supabase, userId, {
      limit,
      offset,
    });

    if (error) throw error;

    // Map from shared query result shape to mobile NotificationData
    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      body: (row.message as string) || '',
      data: row.data,
      type: row.type as string,
      priority: 'normal' as const,
      userId,
      createdAt: row.created_at as string,
      read: row.read as boolean,
    })) as unknown as NotificationData[];
  } catch (error) {
    logger.error('Failed to get user notifications', error);
    throw error;
  }
}

export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const { markNotificationAsRead } = await import('@mintenance/data-access');
    const { error } = await markNotificationAsRead(supabase, notificationId);
    if (error) throw error;
  } catch (error) {
    logger.error('Failed to mark notification as read', error);
    throw error;
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const { markAllNotificationsAsRead } =
      await import('@mintenance/data-access');
    const { error } = await markAllNotificationsAsRead(supabase, userId);
    if (error) throw error;
  } catch (error) {
    logger.error('Failed to mark all notifications as read', error);
    throw error;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { fetchUnreadNotificationCount } =
      await import('@mintenance/data-access');
    const { count, error } = await fetchUnreadNotificationCount(
      supabase,
      userId
    );
    if (error) throw error;
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
    const { error } = await supabase.from('notifications').insert({
      title: notification.title,
      message: notification.body,
      data: notification.data,
      type: notification.type,
      priority: notification.priority,
      user_id: notification.userId,
      read: notification.read,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (error) {
    logger.error('Failed to save notification', error);
    throw error;
  }
}
