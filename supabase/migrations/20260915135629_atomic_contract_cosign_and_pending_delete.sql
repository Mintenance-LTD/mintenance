-- Co-signing, invitation admission and draft deletion lock the same parent row.
-- Actor arguments are supplied only by authenticated server routes.
CREATE TABLE public.contract_cosignature_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
 signer_id uuid NOT NULL REFERENCES public.profiles(id),
 contract_snapshot jsonb NOT NULL,
 accepted_at timestamptz NOT NULL,
 UNIQUE(contract_id,signer_id)
);
ALTER TABLE public.contract_cosignature_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_cosignature_evidence FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.contract_cosignature_evidence TO service_role;

REVOKE INSERT,UPDATE,DELETE ON public.contract_signatories FROM PUBLIC,anon,authenticated;
DO $$ DECLARE cols text; BEGIN
 SELECT string_agg(quote_ident(attname),', ' ORDER BY attnum) INTO cols
 FROM pg_attribute WHERE attrelid='public.contract_signatories'::regclass AND attnum>0 AND NOT attisdropped;
 EXECUTE format('REVOKE INSERT (%s), UPDATE (%s) ON public.contract_signatories FROM PUBLIC,anon,authenticated',cols,cols);
END $$;

CREATE FUNCTION public.guard_contract_signatory_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.contracts WHERE id=NEW.contract_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE='P0002'; END IF;
 IF c.status NOT IN ('draft','pending_homeowner','pending_contractor') THEN
  RAISE EXCEPTION 'Contract no longer accepts invitations' USING ERRCODE='23514'; END IF;
 IF NEW.signed_at IS NOT NULL THEN
  RAISE EXCEPTION 'Invitations cannot contain signatures' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=NEW.contract_id
   AND ((NEW.user_id IS NOT NULL AND user_id=NEW.user_id)
     OR (NEW.invited_email IS NOT NULL AND lower(invited_email)=lower(NEW.invited_email)))) THEN
  RAISE EXCEPTION 'Co-signer already invited' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_contract_signatory_invitation() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_contract_signatory_invitation BEFORE INSERT ON public.contract_signatories
 FOR EACH ROW EXECUTE FUNCTION public.guard_contract_signatory_invitation();

CREATE FUNCTION public.sign_contract_cosigner_atomic(p_contract_id uuid,p_signer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE; signed_time timestamptz; already_signed boolean; promoted boolean:=false;
BEGIN
 SELECT * INTO c FROM public.contracts WHERE id=p_contract_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE='P0002'; END IF;
 PERFORM 1 FROM public.contract_signatories WHERE contract_id=c.id AND user_id=p_signer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Not an invited co-signer' USING ERRCODE='42501'; END IF;
 SELECT min(signed_at),bool_and(signed_at IS NOT NULL) INTO signed_time,already_signed
  FROM public.contract_signatories WHERE contract_id=c.id AND user_id=p_signer_id;
 IF c.status NOT IN ('pending_homeowner','pending_contractor') AND NOT(c.status='accepted' AND already_signed) THEN
  RAISE EXCEPTION 'Contract no longer awaits signatures' USING ERRCODE='23514'; END IF;
 IF NOT already_signed THEN
  -- Older duplicate invitations for one account represent one person's assent.
  -- Do not fabricate an earlier snapshot for a legacy signature.
  IF signed_time IS NULL THEN
   signed_time:=clock_timestamp();
   INSERT INTO public.contract_cosignature_evidence(contract_id,signer_id,contract_snapshot,accepted_at)
    VALUES(c.id,p_signer_id,to_jsonb(c),signed_time);
  END IF;
  UPDATE public.contract_signatories SET signed_at=signed_time
   WHERE contract_id=c.id AND user_id=p_signer_id AND signed_at IS NULL;
 END IF;
 IF c.status IN ('pending_homeowner','pending_contractor')
  AND c.contractor_signed_at IS NOT NULL AND c.homeowner_signed_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=c.id AND signed_at IS NULL) THEN
  UPDATE public.contracts SET status='accepted',updated_at=clock_timestamp() WHERE id=c.id;
  promoted:=true;
  INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
   SELECT party,'Contract fully signed','All required signatures are recorded. Escrow funding is the next step.',
    'contract_signed',CASE WHEN party=c.contractor_id THEN '/contractor/jobs/' ELSE '/jobs/' END || c.job_id::text,
    jsonb_build_object('contractId',c.id,'jobId',c.job_id)
   FROM (SELECT DISTINCT unnest(ARRAY[c.homeowner_id,c.contractor_id]) AS party) parties WHERE party IS NOT NULL;
 END IF;
 RETURN jsonb_build_object('success',true,'signed_at',signed_time,'already_signed',already_signed,'contract_promoted',promoted);
END $$;
REVOKE ALL ON FUNCTION public.sign_contract_cosigner_atomic(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_cosigner_atomic(uuid,uuid) TO service_role;

CREATE FUNCTION public.delete_unsigned_contract_atomic(p_contract_id uuid,p_contractor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.contracts WHERE id=p_contract_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE='P0002'; END IF;
 IF c.contractor_id IS DISTINCT FROM p_contractor_id OR NOT EXISTS
  (SELECT 1 FROM public.profiles WHERE id=p_contractor_id AND role='contractor') THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF c.status NOT IN ('draft','pending_homeowner','pending_contractor')
  OR c.homeowner_signed_at IS NOT NULL OR c.contractor_signed_at IS NOT NULL
  OR EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=c.id AND signed_at IS NOT NULL)
  OR EXISTS(SELECT 1 FROM public.contract_acceptance_evidence WHERE contract_id=c.id)
  OR EXISTS(SELECT 1 FROM public.contract_signatures WHERE contract_id=c.id)
  OR EXISTS(SELECT 1 FROM public.contract_cosignature_evidence WHERE contract_id=c.id) THEN
  RAISE EXCEPTION 'Only unsigned draft or pending contracts can be deleted' USING ERRCODE='23514'; END IF;
 DELETE FROM public.contracts WHERE id=c.id;
 RETURN jsonb_build_object('success',true,'message','Contract deleted successfully');
END $$;
REVOKE ALL ON FUNCTION public.delete_unsigned_contract_atomic(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.delete_unsigned_contract_atomic(uuid,uuid) TO service_role;
