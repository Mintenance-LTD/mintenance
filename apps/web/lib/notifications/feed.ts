import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

export interface FeedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  action_url?: string;
  /**
   * Routing payload (jobId, quoteId, bidId, …) carried straight from the
   * `notifications.metadata` jsonb column. The mobile inbox + web
   * dashboard need this for deep-linking into the right detail view.
   *
   * 2026-05-01 audit follow-up (review pass 4): previously this column
   * was not selected, so /api/notifications?history=1 silently dropped
   * routing context for every queued + immediate notification.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Social-graph notification types that the app no longer surfaces in the
 * notifications feed. Kept in sync with `/api/notifications`.
 */
const SOCIAL_NOTIFICATION_TYPES = new Set([
  'post_liked',
  'comment_added',
  'comment_replied',
  'new_follower',
]);

interface NotificationRow {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  read: boolean | number | null;
  created_at: string | null;
  action_url: string | null;
  user_id: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Fetches and filters notifications using the same rules the API route applies,
 * so the dashboard activity feed and the /notifications page show the same
 * items. Previously the dashboard ran its own unfiltered SELECT and could
 * include social-type rows or old read items the /notifications page hid,
 * which made the two views visibly disagree.
 *
 * Default mode: excludes social types; keeps rows that are either recent
 * (< 24h) OR unread. Sorted by `created_at DESC`, capped at `limit`
 * (default 7 to match the API's default cap). Used by the dashboard
 * activity card and the default `/api/notifications` GET behavior.
 *
 * `includeHistory: true` mode: returns the full notification history,
 * paginated by `limit`/`offset` directly through the DB. Still strips
 * social-type rows. Used by the mobile inbox screen where users expect
 * to scroll past read items rather than see an empty list.
 */
export async function fetchNotificationFeed(
  userId: string,
  opts: {
    limit?: number;
    offset?: number;
    db?: SupabaseClient;
    includeHistory?: boolean;
  } = {}
): Promise<FeedNotification[]> {
  const {
    limit = 7,
    offset = 0,
    db = serverSupabase,
    includeHistory = false,
  } = opts;

  if (includeHistory) {
    // History mode: paginate the DB query directly, skip the recent/unread
    // filter, but still strip social-type rows.
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const { data, error } = await db
      .from('notifications')
      .select(
        'id, type, title, message, read, created_at, action_url, user_id, metadata'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      logger.error('Error fetching notification history', error, {
        service: 'notifications',
        userId,
      });
      return [];
    }

    const rows = (data as NotificationRow[] | null) || [];
    return rows
      .filter((row) => !SOCIAL_NOTIFICATION_TYPES.has(row.type || ''))
      .map<FeedNotification>(toFeedNotification);
  }

  // 2026-05-02 audit follow-up (review pass 5): the default (non-history)
  // branch was missing `metadata` from its SELECT, so the dashboard
  // activity card and `/api/notifications` GET still dropped routing
  // context even after the history branch was fixed in pass 4. Both
  // branches now select the same column set.
  const { data, error } = await db
    .from('notifications')
    .select(
      'id, type, title, message, read, created_at, action_url, user_id, metadata'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    logger.error('Error fetching notification feed', error, {
      service: 'notifications',
      userId,
    });
    return [];
  }

  const now = Date.now();
  const twentyFourHoursAgoMs = now - 24 * 60 * 60 * 1000;

  const rows = (data as NotificationRow[] | null) || [];
  const filtered = rows
    .filter((row) => {
      if (SOCIAL_NOTIFICATION_TYPES.has(row.type || '')) return false;
      const createdAt = new Date(row.created_at || 0).getTime();
      const isRecent = createdAt >= twentyFourHoursAgoMs;
      const isUnread = row.read === false || row.read === 0;
      return isRecent || isUnread;
    })
    .slice(0, limit);

  return filtered.map<FeedNotification>(toFeedNotification);
}

function toFeedNotification(row: NotificationRow): FeedNotification {
  return {
    id: String(row.id || ''),
    type: row.type || 'bid_received',
    title: row.title || 'Notification',
    message: row.message || '',
    read: row.read === true || row.read === 1,
    created_at: row.created_at || new Date().toISOString(),
    link: row.action_url || undefined,
    action_url: row.action_url || undefined,
    metadata: row.metadata ?? undefined,
  };
}
