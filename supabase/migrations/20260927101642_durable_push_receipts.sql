CREATE TABLE public.push_delivery_receipts (
  id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 200),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid NOT NULL,
  token_hash text NOT NULL CHECK (length(token_hash)=64),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','provider_accepted','provider_error','expired')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_check_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
  checked_at timestamptz
);
ALTER TABLE public.push_delivery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_delivery_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.push_delivery_receipts TO service_role;
CREATE INDEX push_delivery_receipts_pending ON public.push_delivery_receipts(next_check_at) WHERE status='pending';
COMMENT ON TABLE public.push_delivery_receipts IS 'Expo receipt journal. Provider acceptance is not proof of display or reading. No raw device tokens or notification contents. Terminal rows retained for 7 days.';
