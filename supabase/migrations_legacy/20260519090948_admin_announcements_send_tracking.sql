ALTER TABLE public.admin_announcements
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS send_results jsonb;

COMMENT ON COLUMN public.admin_announcements.sent_at IS
  'When the announcement was dispatched to its target audience.';
COMMENT ON COLUMN public.admin_announcements.sent_by IS
  'Admin who triggered the dispatch.';
COMMENT ON COLUMN public.admin_announcements.send_results IS
  'Per-channel send tallies {email,push,inApp} from the last dispatch.';;
