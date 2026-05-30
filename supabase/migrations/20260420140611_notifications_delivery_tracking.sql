-- Add multi-channel delivery-tracking columns to `notifications`.
--
-- Applied live 2026-04-20 via Supabase MCP.
--
-- Context (2026-04-16 live-DB audit finding P1-8):
--   The notifications table has no DB-level signal for whether a
--   notification actually reached the user via push / email.
--   Debugging "my push didn't arrive" in production today means
--   grepping application logs; these columns make the state
--   queryable.
--
-- Semantics:
--   push_sent    = true once Expo Push API accepted the message
--                  for at least one of the user's registered
--                  devices. NOT a guarantee of device delivery —
--                  Expo receipts would be the next fidelity step.
--                  Default false; flipped by NotificationPush
--                  Dispatcher on success.
--   email_sent   = true once the email provider accepted the
--                  message. Column reserved; NOT set by this
--                  commit because the email path lives outside
--                  NotificationService (each API route calls
--                  EmailService directly). Future work: thread
--                  the notificationId through those call sites.
--   delivered_at = timestamp of the FIRST successful channel
--                  acceptance (push first today, email added
--                  later). Useful for "time-to-first-signal"
--                  queries. Stays null for rows where every
--                  channel was skipped or failed.
--
-- Safe to apply to a live table: all three are additive,
-- non-breaking, and have harmless defaults.

BEGIN;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS push_sent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Useful for "notifications sent in last 24h that never reached
-- any channel" queries that the admin dashboard might want.
CREATE INDEX IF NOT EXISTS idx_notifications_undelivered
  ON public.notifications (created_at DESC)
  WHERE delivered_at IS NULL;

COMMIT;
