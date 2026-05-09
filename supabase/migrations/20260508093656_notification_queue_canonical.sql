-- 2026-05-02 audit follow-up (review pass 5) — canonical CREATE TABLE
-- migration for `public.notification_queue`. Idempotent.

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
