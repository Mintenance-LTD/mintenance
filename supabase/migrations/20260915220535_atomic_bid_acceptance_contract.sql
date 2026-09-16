-- Retain cancelled agreements and their funding/signature references while allowing a new agreement.
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_job_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS contracts_one_current_per_job ON public.contracts(job_id)
 WHERE status <> 'cancelled';
CREATE OR REPLACE FUNCTION public.protect_cancelled_contract_history()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.status='cancelled' AND NEW IS DISTINCT FROM OLD THEN
  RAISE EXCEPTION 'Cancelled contract history cannot be modified' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_cancelled_contract_history() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS protect_cancelled_contract_history ON public.contracts;
CREATE TRIGGER protect_cancelled_contract_history BEFORE UPDATE ON public.contracts
 FOR EACH ROW EXECUTE FUNCTION public.protect_cancelled_contract_history();

-- Commit the complete bid-derived draft in the acceptance transaction, not in a later HTTP step.
CREATE OR REPLACE FUNCTION public.accept_bid_with_capacity(
 p_bid_id uuid,p_job_id uuid,p_contractor_id uuid,p_homeowner_id uuid,p_active_job_limit integer
) RETURNS TABLE(success boolean,error_message text,accepted_bid_id uuid,job_status varchar)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE j public.jobs%ROWTYPE; b public.bids%ROWTYPE; c public.contracts%ROWTYPE;
 profile public.profiles%ROWTYPE; insurance public.contractor_insurance%ROWTYPE;
 accepted record; already_applied boolean; proposal text; start_at timestamptz; end_at timestamptz;
 contract_terms jsonb; contract_id uuid;
BEGIN
 IF p_active_job_limit IS NOT NULL AND p_active_job_limit<1 THEN
 RAISE EXCEPTION 'Invalid active job limit' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('bid-capacity:'||p_contractor_id::text,0));
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND OR (p_homeowner_id IS NULL OR coalesce(j.payer_user_id,j.homeowner_id) IS DISTINCT FROM p_homeowner_id) THEN
 RETURN QUERY SELECT false,'Not authorized to accept bids for this job'::text,NULL::uuid,NULL::varchar; RETURN; END IF;
 SELECT * INTO b FROM public.bids WHERE id=p_bid_id AND job_id=j.id AND contractor_id=p_contractor_id FOR UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT false,'Bid not found or does not belong to this job'::text,NULL::uuid,NULL::varchar; RETURN; END IF;
 already_applied:=b.status='accepted' AND j.status='assigned' AND j.contractor_id=p_contractor_id;
 IF NOT already_applied THEN
  IF p_active_job_limit IS NOT NULL AND (SELECT count(*) FROM public.jobs
   WHERE contractor_id=p_contractor_id AND status IN('assigned','in_progress'))>=p_active_job_limit THEN
   RETURN QUERY SELECT false,'Contractor active job limit reached'::text,NULL::uuid,NULL::varchar; RETURN;
  END IF;
  SELECT * INTO accepted FROM public.accept_bid_atomic(p_bid_id,p_job_id,p_contractor_id,p_homeowner_id);
  IF accepted.success IS DISTINCT FROM true THEN
   RETURN QUERY SELECT accepted.success,accepted.error_message,accepted.accepted_bid_id,accepted.job_status; RETURN;
  END IF;
 END IF;
 SELECT * INTO c FROM public.contracts WHERE job_id=j.id AND status<>'cancelled' FOR UPDATE;
 IF FOUND THEN
  -- Never attach a newly assigned contractor to a different or cancelled agreement.
  IF c.contractor_id IS DISTINCT FROM b.contractor_id OR c.homeowner_id IS DISTINCT FROM p_homeowner_id
   OR (NOT already_applied AND c.amount IS DISTINCT FROM b.amount) OR c.status NOT IN('draft','pending_homeowner','pending_contractor','accepted') THEN
   RAISE EXCEPTION 'Existing contract does not match this acceptance' USING ERRCODE='23514';
  END IF;
 ELSE
  SELECT * INTO profile FROM public.profiles WHERE id=b.contractor_id;
  SELECT * INTO insurance FROM public.contractor_insurance WHERE contractor_id=b.contractor_id AND status='active'
   ORDER BY created_at DESC,id DESC LIMIT 1;
  proposal:=NULLIF(btrim(coalesce(b.message,b.description,'')),'');
  IF b.proposed_start_date IS NOT NULL THEN
   start_at:=(b.proposed_start_date::date+time '09:00:00') AT TIME ZONE 'UTC';
   IF b.estimated_duration_days>0 THEN end_at:=start_at+make_interval(days=>b.estimated_duration_days); END IF;
  END IF;
  contract_terms:=jsonb_build_object('source','accepted_bid','bid_id',b.id,'created_from','bid_acceptance');
  IF insurance.provider IS NOT NULL THEN contract_terms:=contract_terms||jsonb_build_object('insurance_provider',insurance.provider); END IF;
  IF insurance.policy_number IS NOT NULL THEN contract_terms:=contract_terms||jsonb_build_object('insurance_policy_number',insurance.policy_number); END IF;
  IF insurance.expiry_date IS NOT NULL THEN contract_terms:=contract_terms||jsonb_build_object('insurance_expiry_date',insurance.expiry_date); END IF;
  IF b.estimated_duration_days>0 THEN contract_terms:=contract_terms||jsonb_build_object('estimated_duration_days',b.estimated_duration_days); END IF;
  IF b.warranty_months>0 THEN contract_terms:=contract_terms||jsonb_build_object('warranty_months',b.warranty_months); END IF;
  IF b.materials_included IS TRUE THEN contract_terms:=contract_terms||'{"materials_included":true}'::jsonb; END IF;
  INSERT INTO public.contracts(job_id,contractor_id,homeowner_id,title,description,amount,status,start_date,end_date,terms,
   contractor_company_name,contractor_license_registration,contractor_license_type,quote_id)
  VALUES(j.id,b.contractor_id,p_homeowner_id,'Contract for '||coalesce(j.title,'Job'),
   coalesce(proposal,'Contract created from accepted bid for "'||coalesce(j.title,'this job')||'"'),b.amount,
   'pending_contractor',start_at,end_at,contract_terms,profile.company_name,profile.license_number,profile.license_type,b.quote_id)
  RETURNING id INTO contract_id;
  INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
   SELECT party,'Contract ready for review','Review the proposed contract terms and sign to proceed.','contract_created',
    CASE WHEN party=b.contractor_id THEN '/contractor/jobs/' ELSE '/jobs/' END||j.id::text,
    jsonb_build_object('jobId',j.id,'contractId',contract_id,'bidId',b.id)
   FROM (SELECT DISTINCT unnest(ARRAY[p_homeowner_id,b.contractor_id]) party) parties;
 END IF;
 RETURN QUERY SELECT true,NULL::text,b.id,'assigned'::varchar;
END $$;
REVOKE ALL ON FUNCTION public.accept_bid_with_capacity(uuid,uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_bid_with_capacity(uuid,uuid,uuid,uuid,integer) TO service_role;
