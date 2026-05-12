/**
 * Shared types for `/contractor/notifications`.
 *
 * The page (controller) and `MintEditorialNotificationsView`
 * (presentational) both reference these so handler signatures stay
 * in sync. TypeScript treats locally-declared identical interfaces
 * as nominally distinct types — extracting them here gives us a
 * single source of truth.
 */

export type NotificationType =
  | 'job'
  | 'bid'
  | 'message'
  | 'payment'
  | 'system'
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'job_update'
  | 'job_viewed'
  | 'job_nearby'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'project_reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

export type FilterType = 'all' | 'unread' | 'jobs' | 'messages' | 'payments';

export interface NotificationFilterTab {
  label: string;
  value: FilterType;
  count: number;
}
