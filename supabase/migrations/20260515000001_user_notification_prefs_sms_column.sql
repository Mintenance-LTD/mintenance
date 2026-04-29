-- Audit re-review (2026-04-29): finish the notification-preferences
-- consolidation flagged in step 9 of the audit punch list.
--
-- Two preference surfaces existed in parallel:
--
--   /api/user/notification-preferences (singular, canonical)
--     → public.user_notification_preferences row
--     → 7 fields: push/email/in-app booleans, disabled_types[],
--       quiet_hours_start/end, timezone
--
--   /api/users/notification-preferences (plural, legacy)
--     → public.profiles.notification_preferences JSONB
--     → 17 fields including SMS toggles + per-category granularity
--
-- The plural route was kept alive only because the singular table
-- had no `sms_enabled` column to back the inline-settings SMS
-- toggles in `apps/web/app/settings/_components/
-- notifications-section.tsx`. This migration adds the column so the
-- canonical surface can expose the SMS toggle and the plural route
-- + JSONB column can be retired in a follow-up.
--
-- Backfill: existing rows default to `true` to match the historical
-- plural-route default (`smsJobs/smsMessages/smsPayments` were all
-- `true` in `DEFAULT_PREFS`). Users who had explicitly disabled SMS
-- in the plural UI will need to toggle it off again — acceptable
-- because (a) the plural-route audit confirmed both DB locations
-- have 0 prod rows, and (b) the SMS Twilio integration is
-- contractor-tier-only so the affected user count is small.

ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.user_notification_preferences.sms_enabled IS
  'Per-user opt-in for SMS notifications via Twilio. Backfilled to TRUE in migration 20260515000001 to match the legacy /api/users/notification-preferences DEFAULT_PREFS shape; users can toggle off via /settings/notifications.';
