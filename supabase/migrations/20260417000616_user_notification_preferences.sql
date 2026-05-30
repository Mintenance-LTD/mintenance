-- Audit 2026-04-16 P1 #7: users have no way to opt in/out of notification
-- channels (push/email/in-app) or specific event types. The original migration
-- 20260215000001 was intended to land this table but never did.
--
-- Schema:
--   - one row per user, created on first preference update (lazy init)
--   - boolean toggles for push/email/in-app channels
--   - disabled_types: JSON array of notification `type` values to suppress
--   - quiet_hours window (optional; times in user's timezone)
--
-- RLS: users manage their own row; service role has full access for push
-- fan-out logic in NotificationService.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
  email_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
  in_app_enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  disabled_types     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  quiet_hours_start  TIME        NULL,
  quiet_hours_end    TIME        NULL,
  timezone           TEXT        NOT NULL DEFAULT 'UTC',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users read/insert/update only their own preferences row.
DROP POLICY IF EXISTS user_notif_prefs_select_own ON public.user_notification_preferences;
CREATE POLICY user_notif_prefs_select_own ON public.user_notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_notif_prefs_insert_own ON public.user_notification_preferences;
CREATE POLICY user_notif_prefs_insert_own ON public.user_notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_notif_prefs_update_own ON public.user_notification_preferences;
CREATE POLICY user_notif_prefs_update_own ON public.user_notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role needs full access so NotificationService can query preferences
-- while running with the service-role key on the server.
DROP POLICY IF EXISTS user_notif_prefs_service_role ON public.user_notification_preferences;
CREATE POLICY user_notif_prefs_service_role ON public.user_notification_preferences
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Auto-update updated_at on every UPDATE.
DROP TRIGGER IF EXISTS user_notification_preferences_set_updated_at
  ON public.user_notification_preferences;
CREATE TRIGGER user_notification_preferences_set_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
