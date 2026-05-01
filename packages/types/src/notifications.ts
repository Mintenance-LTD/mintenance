// Notification types matching DB: public.notifications
//
// 2026-05-01 audit follow-up: schema drift settled. The DB column is
// `metadata` (jsonb) — verified live and locked in by migration
// supabase/migrations/20260501000000_notifications_metadata_canonical.sql.
// The historical `data` field was dropped; do not add it back.
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string; // DB: nullable TEXT
  metadata?: Record<string, unknown>; // DB column: metadata JSONB
  read: boolean;
  read_at?: string; // DB: TIMESTAMPTZ
  created_at: string;
  action_url?: string;
  /** Set by NotificationPushDispatcher once Expo accepts the message. */
  push_sent?: boolean;
  /** Set by NotificationService.markEmailSent once the email provider accepts it. */
  email_sent?: boolean;
  /** Timestamp of first successful channel acceptance (null if every channel skipped/failed). */
  delivered_at?: string;
}
