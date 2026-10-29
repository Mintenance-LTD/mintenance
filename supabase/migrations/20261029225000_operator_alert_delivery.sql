-- Operational email outbox: server-only, hourly deduplication, fenced leases.
CREATE TABLE public.operator_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  job_name text NOT NULL,
  run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  lease_token uuid,
  retry_after timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operator_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operator_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.operator_alerts TO service_role;
CREATE INDEX operator_alerts_pending ON public.operator_alerts(retry_after) WHERE sent_at IS NULL;

CREATE FUNCTION public.claim_operator_alert() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE claimed public.operator_alerts;
BEGIN
  UPDATE public.operator_alerts SET lease_token=gen_random_uuid(),
    retry_after=now()+interval '5 minutes', attempts=attempts+1
  WHERE id=(SELECT id FROM public.operator_alerts WHERE sent_at IS NULL AND retry_after<=now()
    ORDER BY retry_after,created_at FOR UPDATE SKIP LOCKED LIMIT 1)
  RETURNING * INTO claimed;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(claimed);
END $$;
REVOKE ALL ON FUNCTION public.claim_operator_alert() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_operator_alert() TO service_role;

CREATE FUNCTION public.finish_operator_alert(p_id uuid,p_token uuid,p_sent boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.operator_alerts SET sent_at=CASE WHEN p_sent THEN now() ELSE NULL END,
    lease_token=NULL,retry_after=now()+interval '5 minutes'
  WHERE id=p_id AND lease_token=p_token AND sent_at IS NULL;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.finish_operator_alert(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_operator_alert(uuid,uuid,boolean) TO service_role;
