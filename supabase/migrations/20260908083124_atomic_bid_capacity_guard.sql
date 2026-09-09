-- Tier/early-access resolution remains in the server. This service-only wrapper
-- makes its capacity decision atomic across different jobs for one contractor.
CREATE FUNCTION public.accept_bid_with_capacity(
  p_bid_id uuid, p_job_id uuid, p_contractor_id uuid, p_homeowner_id uuid,
  p_active_job_limit integer
) RETURNS TABLE(success boolean, error_message text, accepted_bid_id uuid, job_status varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_active_job_limit IS NOT NULL AND p_active_job_limit < 1 THEN
    RAISE EXCEPTION 'Invalid active job limit';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('bid-capacity:' || p_contractor_id::text, 0));
  IF p_active_job_limit IS NOT NULL AND
     (SELECT count(*) FROM public.jobs WHERE contractor_id=p_contractor_id AND status IN ('assigned','in_progress')) >= p_active_job_limit THEN
    RETURN QUERY SELECT false, 'Contractor active job limit reached'::text, NULL::uuid, NULL::varchar;
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM public.accept_bid_atomic(p_bid_id, p_job_id, p_contractor_id, p_homeowner_id);
END $$;
REVOKE ALL ON FUNCTION public.accept_bid_with_capacity(uuid,uuid,uuid,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_bid_with_capacity(uuid,uuid,uuid,uuid,integer) TO service_role;
