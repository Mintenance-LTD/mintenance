-- Trusted analyzer results must bind to the exact current completion and evidence set.
CREATE FUNCTION public.record_completion_photo_verification(
 p_job_id uuid, p_escrow_id uuid, p_actor_id uuid, p_expected_completed_at timestamptz,
 p_photo_ids uuid[], p_quality_passed boolean, p_geolocation_verified boolean,
 p_timestamp_verified boolean, p_comparison_score double precision, p_verified boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; e public.escrow_transactions%ROWTYPE;
 last_rework timestamptz; matched integer;
BEGIN
 IF p_actor_id IS NULL OR p_expected_completed_at IS NULL OR
  coalesce(cardinality(p_photo_ids),0) NOT BETWEEN 1 AND 20 OR
  p_quality_passed IS NULL OR p_geolocation_verified IS NULL OR
  p_timestamp_verified IS NULL OR p_verified IS NULL OR
  (p_comparison_score IS NOT NULL AND NOT (p_comparison_score BETWEEN 0 AND 1)) OR
  (p_verified AND NOT (p_quality_passed AND p_geolocation_verified AND p_timestamp_verified)) THEN
  RAISE EXCEPTION 'Invalid photo verification result' USING ERRCODE='23514'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO e FROM public.escrow_transactions WHERE job_id=j.id
  ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR e.id IS DISTINCT FROM p_escrow_id THEN
  RAISE EXCEPTION 'Current escrow not found' USING ERRCODE='P0002'; END IF;
 IF (p_actor_id IS DISTINCT FROM j.contractor_id OR p_actor_id IS DISTINCT FROM e.payee_id)
  AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin') THEN
  RAISE EXCEPTION 'Not authorized to verify completion' USING ERRCODE='42501'; END IF;
 IF j.status<>'completed' OR j.completed_at IS DISTINCT FROM p_expected_completed_at OR
  e.status NOT IN('held','awaiting_homeowner_approval') OR e.homeowner_approval IS TRUE OR
  coalesce(e.admin_hold_status,'none') NOT IN('none','admin_approved') THEN
  RAISE EXCEPTION 'Completion changed or is no longer available for verification' USING ERRCODE='23514'; END IF;
 SELECT max(created_at) INTO last_rework FROM public.job_rework_requests WHERE job_id=j.id;
 SELECT count(*) INTO matched FROM (
  SELECT id FROM public.job_photos_metadata WHERE id=ANY(p_photo_ids)
   AND job_id=j.id AND photo_type='after' AND verified IS TRUE
   AND (last_rework IS NULL OR created_at>last_rework) FOR SHARE
 ) photos;
 IF matched<>cardinality(p_photo_ids) THEN
  RAISE EXCEPTION 'Current completion photos are required' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_transactions SET photo_quality_passed=p_quality_passed,
  geolocation_verified=p_geolocation_verified,timestamp_verified=p_timestamp_verified,
  before_after_comparison_score=p_comparison_score,
  photo_verification_status=CASE WHEN p_verified THEN 'verified' ELSE 'manual_review' END,
  updated_at=now() WHERE id=e.id;
 IF p_verified THEN
  PERFORM public.record_completion_review(j.id,e.id,p_actor_id,p_expected_completed_at,'request',NULL);
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_completion_photo_verification(uuid,uuid,uuid,timestamptz,uuid[],boolean,boolean,boolean,double precision,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_completion_photo_verification(uuid,uuid,uuid,timestamptz,uuid[],boolean,boolean,boolean,double precision,boolean) TO service_role;
