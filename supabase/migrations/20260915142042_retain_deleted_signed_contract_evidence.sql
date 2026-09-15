-- Archive in the parent DELETE transaction, before child FK cascades execute.
-- There are deliberately no user/profile/job foreign keys in the retained copy.
CREATE TABLE public.retained_contract_records (
 contract_id uuid PRIMARY KEY,
 job_id uuid NOT NULL,
 participant_ids uuid[] NOT NULL,
 evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence)='object'),
 archived_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 retention_reason text NOT NULL DEFAULT 'signed_contract_legal_claims',
 review_due_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '30 days'),
 retention_until timestamptz,
 requires_retention_review boolean NOT NULL DEFAULT true
);
ALTER TABLE public.retained_contract_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.retained_contract_records FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.retained_contract_records TO service_role;
CREATE INDEX retained_contract_records_participants_idx ON public.retained_contract_records USING gin(participant_ids);
COMMENT ON TABLE public.retained_contract_records IS 'Restricted deletion archive. Retention dates require classification; not an automatic six-year expiry or complete erasure implementation.';

CREATE FUNCTION public.archive_deleted_signed_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE participants uuid[]; acceptance jsonb; images jsonb; cosignatures jsonb; signatories jsonb; identities jsonb;
BEGIN
 IF OLD.status IS DISTINCT FROM 'accepted' AND OLD.contractor_signed_at IS NULL AND OLD.homeowner_signed_at IS NULL
  AND NOT EXISTS(SELECT 1 FROM public.contract_acceptance_evidence WHERE contract_id=OLD.id)
  AND NOT EXISTS(SELECT 1 FROM public.contract_signatures WHERE contract_id=OLD.id)
  AND NOT EXISTS(SELECT 1 FROM public.contract_cosignature_evidence WHERE contract_id=OLD.id)
  AND NOT EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=OLD.id AND signed_at IS NOT NULL) THEN
  RETURN OLD;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.accepted_at,e.id),'[]') INTO acceptance
  FROM public.contract_acceptance_evidence e WHERE contract_id=OLD.id;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]') INTO images
  FROM public.contract_signatures e WHERE contract_id=OLD.id;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.accepted_at,e.id),'[]') INTO cosignatures
  FROM public.contract_cosignature_evidence e WHERE contract_id=OLD.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'role',role,'signed_at',signed_at) ORDER BY id),'[]') INTO signatories
  FROM public.contract_signatories WHERE contract_id=OLD.id AND signed_at IS NOT NULL;
 SELECT array_agg(DISTINCT actor ORDER BY actor) INTO participants FROM (
  SELECT OLD.homeowner_id AS actor UNION SELECT OLD.contractor_id
  UNION SELECT signer_id FROM public.contract_acceptance_evidence WHERE contract_id=OLD.id
  UNION SELECT signer_id FROM public.contract_cosignature_evidence WHERE contract_id=OLD.id
  UNION SELECT user_id FROM public.contract_signatories WHERE contract_id=OLD.id AND signed_at IS NOT NULL
 ) p WHERE actor IS NOT NULL;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'first_name',first_name,'last_name',last_name,
  'company_name',company_name) ORDER BY id),'[]') INTO identities FROM public.profiles WHERE id=ANY(participants);
 INSERT INTO public.retained_contract_records(contract_id,job_id,participant_ids,evidence)
  VALUES(OLD.id,OLD.job_id,participants,jsonb_build_object('version',1,'contract',to_jsonb(OLD),'parties',identities,
   'acceptance_evidence',acceptance,'signature_images',images,'cosignature_evidence',cosignatures,'signatories',signatories));
 -- No ON CONFLICT overwrite: a reused source ID must not replace an earlier agreement.
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.archive_deleted_signed_contract() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER archive_deleted_signed_contract BEFORE DELETE ON public.contracts
 FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_signed_contract();

CREATE FUNCTION public.read_retained_contract(p_contract_id uuid,p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.retained_contract_records%ROWTYPE;
BEGIN
 -- Fresh authorization on every read, with no administrator bypass.
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.retained_contract_records WHERE contract_id=p_contract_id AND p_user_id=ANY(participant_ids);
 IF NOT FOUND THEN RAISE EXCEPTION 'Retained contract not found' USING ERRCODE='P0002'; END IF;
 -- Raw evidence (IP, user-agent and signature payload) is never returned by this viewer.
 RETURN jsonb_build_object('contract',(SELECT jsonb_object_agg(key,value)
   FROM jsonb_each(r.evidence->'contract') WHERE key=ANY(ARRAY['id','job_id','homeowner_id','contractor_id','status','terms','title','description','start_date','end_date','amount','contractor_signed_at','homeowner_signed_at','contract_version','created_at','updated_at','contractor_company_name','contractor_license_registration','contractor_license_type'])),
  'parties',r.evidence->'parties',
  'archived_at',r.archived_at,'requires_retention_review',r.requires_retention_review,
  'signatures',coalesce((SELECT jsonb_agg(jsonb_build_object('signer_id',e->'signer_id','role',e->'signer_role','accepted_at',e->'accepted_at'))
   FROM jsonb_array_elements(r.evidence->'acceptance_evidence') e),'[]'::jsonb),
  'cosignatures',r.evidence->'signatories');
END $$;
REVOKE ALL ON FUNCTION public.read_retained_contract(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_retained_contract(uuid,uuid) TO service_role;
