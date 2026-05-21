-- 2026-05-02 audit follow-up (review pass 5) — canonical CREATE TABLE
-- migration for `public.notification_queue`.
--
-- The table exists in production (verified live via Supabase MCP) and
-- runtime code in NotificationAgent.queueNotification +
-- NotificationProcessorService + NotificationPushDispatcher all read
-- and write it. But no committed migration ever created the table —
-- the closest thing was 20260319000001_security_advisor_fixes.sql which
-- only added an RLS policy on the pre-existing table.
--
-- That meant a fresh checkout (CI ephemeral DB, new dev clone, disaster
-- restore) would build a database whose runtime contract diverged from
-- prod: the queue drain would 404 on `from('notification_queue')`,
-- engagement-deferred + failed-push notifications would silently
-- disappear, and pass-4's failed_push retry path would never fire.
--
-- This migration is idempotent — `IF NOT EXISTS` everywhere — so it's
-- a no-op on production (table + indexes + policies already exist) and
-- bootstraps everything correctly on every other environment.
--
-- The schema below mirrors the live state exactly, captured 2026-05-02:
--   18 columns (id, user_id, notification_type, priority, title,
--   message, action_url, metadata, scheduled_for, sent_at, batch_id,
--   batch_sent_at, status, retry_count, last_retry_at, error_message,
--   created_at, updated_at)
--   6 indexes
--   3 RLS policies
-- Status values used in code: 'pending', 'sent', 'failed_push', 'failed'.
-- The CHECK constraint is intentionally permissive (no enum) so future
-- statuses don't need a migration to roll out.

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR NOT NULL,
  priority VARCHAR NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  batch_id UUID,
  batch_sent_at TIMESTAMPTZ,
  status VARCHAR DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (mirror the production set 1:1).
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id
  ON public.notification_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status
  ON public.notification_queue (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority
  ON public.notification_queue (priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_batch_id
  ON public.notification_queue (batch_id)
  WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for
  ON public.notification_queue (scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_unsent
  ON public.notification_queue (scheduled_for)
  WHERE sent_at IS NULL;

-- RLS: enable + recreate the three policies live has. Two of them are
-- functionally identical SELECTs (one was added by the security
-- advisor pass on 2026-03-19, the other was the original) — keeping
-- both so the live state matches exactly and a future cleanup migration
-- can drop the redundant one without churn.
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.notification_queue'::regclass
      AND polname = 'Service can manage queue'
  ) THEN
    CREATE POLICY "Service can manage queue"
      ON public.notification_queue
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.notification_queue'::regclass
      AND polname = 'Users can view their own queue'
  ) THEN
    CREATE POLICY "Users can view their own queue"
      ON public.notification_queue
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.notification_queue'::regclass
      AND polname = 'Users can view their own queued notifications'
  ) THEN
    CREATE POLICY "Users can view their own queued notifications"
      ON public.notification_queue
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;
