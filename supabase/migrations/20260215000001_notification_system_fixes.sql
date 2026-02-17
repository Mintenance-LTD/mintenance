-- ============================================================================
-- Notification System Fixes
-- Adds missing columns to notifications table and creates supporting tables
-- for push token registration and notification preferences.
-- ============================================================================

-- 1. Add missing columns to notifications table
-- priority: used by mobile for visual treatment (low/normal/high)
-- updated_at: used by markAsRead/markAllAsRead to track modification time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- 2. Push token storage for mobile push notifications (Expo)
-- Mobile calls savePushToken() on app launch to register device tokens.
-- sendPushNotification() reads tokens to deliver via Expo Push API.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON public.user_push_tokens(user_id);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own push tokens
CREATE POLICY "push_tokens_manage_own"
  ON public.user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Notification preferences storage
-- Stores per-user JSONB preferences for notification types and quiet hours.
-- Mobile reads/writes via getNotificationPreferences/updateNotificationPreferences.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "notification_prefs_manage_own"
  ON public.user_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);
