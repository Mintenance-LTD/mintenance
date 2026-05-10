-- Audit re-review (2026-04-29): finish the notification-preferences
-- consolidation flagged in step 9 of the audit punch list.
-- Adds sms_enabled to user_notification_preferences so the canonical
-- singular surface can expose the SMS toggle and the plural route +
-- profiles.notification_preferences JSONB column can be retired.

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.user_notification_preferences.sms_enabled IS
  'Per-user opt-in for SMS notifications via Twilio. Backfilled to TRUE in migration 20260515000001 to match the legacy /api/users/notification-preferences DEFAULT_PREFS shape; users can toggle off via /settings/notifications.';
