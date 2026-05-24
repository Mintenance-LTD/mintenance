-- 2026-05-24 audit-36 P1: notification_queue_status_check only allowed
-- pending/sent/cancelled/failed, but the application code uses
-- 'failed_push' as a distinct retryable state separate from terminal
-- 'failed'. NotificationPushDispatcher inserts retry rows with
-- status='failed_push' and NotificationProcessorService.processQueued
-- selects on `status IN ('pending', 'failed_push')`. Every push that
-- failed at send time was rejected at insert by the CHECK and the
-- retry path never fired — bid/message/tracking/arrival pushes that
-- hit transient FCM/APNs errors never recovered. Extend the allowed
-- set to include 'failed_push' so the queue state matches the code.
--
-- Applied live via Supabase MCP 2026-05-24.

ALTER TABLE public.notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_status_check;

ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_status_check
    CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'cancelled'::character varying, 'failed'::character varying, 'failed_push'::character varying])::text[]));
