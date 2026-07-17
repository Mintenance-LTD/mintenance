/**
 * Notification query definitions — consistent across web and mobile.
 *
 * Key difference from mobile's current behavior:
 *   - Web filters out social types (post_liked, comment_added, new_follower)
 *   - Web limits to last 24h OR unread
 *   - Mobile currently shows ALL notifications without filtering
 *
 * These shared queries align both platforms.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { SOCIAL_NOTIFICATION_TYPES } from '@mintenance/types';

/**
 * Social notification types excluded from the main feed.
 * 2026-07-17: re-exported from the canonical registry in
 * @mintenance/types — this file previously carried its own 3-entry
 * copy that was missing `comment_replied`, so the mobile inbox showed
 * rows the web feed hid.
 */
export { SOCIAL_NOTIFICATION_TYPES };

// ─── Query functions ─────────────────────────────────────────────

/**
 * Fetch user notifications (main feed — excludes social types).
 * Matches the web API behavior at GET /api/notifications.
 */
export async function fetchUserNotifications(
  client: SupabaseClient,
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = options;

  // Last 24 hours OR unread — matches web filtering
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  return client
    .from('notifications')
    .select('id, type, title, message, read, created_at, action_url, data')
    .eq('user_id', userId)
    .not('type', 'in', `(${SOCIAL_NOTIFICATION_TYPES.join(',')})`)
    .or(`read.eq.false,created_at.gte.${twentyFourHoursAgo}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

/**
 * Fetch unread notification count (excluding social types).
 */
export async function fetchUnreadNotificationCount(
  client: SupabaseClient,
  userId: string
) {
  return client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
    .not('type', 'in', `(${SOCIAL_NOTIFICATION_TYPES.join(',')})`);
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  client: SupabaseClient,
  notificationId: string
) {
  return client
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsAsRead(
  client: SupabaseClient,
  userId: string
) {
  return client
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);
}
