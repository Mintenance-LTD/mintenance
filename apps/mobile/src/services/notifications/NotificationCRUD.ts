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
 * Fetch user notifications via direct Supabase query.
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationData[]> {
  try {
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

    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      body: (row.message as string) || '',
      data: row.data,
      type: row.type as string,
      priority: (row.priority as string) || 'normal',
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
