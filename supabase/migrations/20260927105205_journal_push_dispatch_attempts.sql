CREATE TABLE public.push_dispatch_attempts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid,
  device_count integer NOT NULL CHECK (device_count BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','recorded','needs_review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.push_dispatch_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_dispatch_attempts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.push_dispatch_attempts TO service_role;
CREATE INDEX push_dispatch_attempts_unfinished ON public.push_dispatch_attempts(created_at) WHERE status='started';
COMMENT ON TABLE public.push_dispatch_attempts IS 'Pre-send journal, containing no message or device token. Uncertain provider outcomes require review; this journal does not authorize a resend.';
