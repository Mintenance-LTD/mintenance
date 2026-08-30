BEGIN;

CREATE OR REPLACE FUNCTION public.contractor_postcode_proof_count(
  p_contractor_id uuid,
  p_postcode_prefix text
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT homeowner_id)::integer
  FROM public.jobs
  WHERE contractor_id = p_contractor_id
    AND status = 'completed'
    AND completed_at IS NOT NULL
    AND completed_at > (now() - interval '12 months')
    AND upper(regexp_replace(coalesce(postcode, ''), '\s+', '', 'g'))
          LIKE (upper(p_postcode_prefix) || '%')
$$;

GRANT EXECUTE ON FUNCTION public.contractor_postcode_proof_count(uuid, text)
  TO authenticated, service_role, anon;

CREATE INDEX IF NOT EXISTS idx_jobs_completed_postcode_recent
  ON public.jobs (contractor_id, postcode, homeowner_id)
  WHERE status = 'completed'
    AND completed_at IS NOT NULL
    AND postcode IS NOT NULL;

COMMIT;;
