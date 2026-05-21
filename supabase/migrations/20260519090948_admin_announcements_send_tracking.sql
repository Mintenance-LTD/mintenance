-- Admin announcements: send-tracking columns.
--
-- Audit 2026-05-18: /api/admin/announcements/send read and wrote a
-- separate `announcements` table (0 rows in production) while the
-- create / list / update / delete paths all use `admin_announcements`
-- via AdminCommunicationService. As a result every "send" 404'd
-- ("Announcement not found") because it looked in the wrong table.
--
-- The send route is being repointed at `admin_announcements`; that
-- table lacked the dispatch-tracking columns the route records, so
-- add them here.
ALTER TABLE public.admin_announcements
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS send_results jsonb;

COMMENT ON COLUMN public.admin_announcements.sent_at IS
  'When the announcement was dispatched to its target audience.';
COMMENT ON COLUMN public.admin_announcements.sent_by IS
  'Admin who triggered the dispatch.';
COMMENT ON COLUMN public.admin_announcements.send_results IS
  'Per-channel send tallies {email,push,inApp} from the last dispatch.';
