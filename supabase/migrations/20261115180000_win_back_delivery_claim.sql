-- A durable claim is independent of in-app/push preferences and survives worker failure.
CREATE TABLE IF NOT EXISTS public.win_back_deliveries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sending','sent','failed'))
);
ALTER TABLE public.win_back_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.win_back_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.win_back_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.claim_win_back_delivery(p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH claimed AS (
    INSERT INTO public.win_back_deliveries(user_id,attempted_at,status)
    VALUES(p_user_id,now(),'sending')
    ON CONFLICT(user_id) DO UPDATE SET attempted_at=now(),status='sending'
      WHERE win_back_deliveries.attempted_at < now()-interval '30 days'
    RETURNING user_id
  ) SELECT EXISTS(SELECT 1 FROM claimed);
$$;
REVOKE ALL ON FUNCTION public.claim_win_back_delivery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_win_back_delivery(uuid) TO service_role;
