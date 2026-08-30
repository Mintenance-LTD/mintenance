
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

DROP POLICY IF EXISTS user_notif_prefs_service_role ON public.user_notification_preferences;
CREATE POLICY user_notif_prefs_service_role ON public.user_notification_preferences
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS user_notification_preferences_set_updated_at
  ON public.user_notification_preferences;
CREATE TRIGGER user_notification_preferences_set_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
;
