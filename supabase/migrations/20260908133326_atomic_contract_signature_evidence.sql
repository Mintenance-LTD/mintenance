CREATE TABLE public.contract_acceptance_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_id uuid NOT NULL REFERENCES public.profiles(id),
  signer_role text NOT NULL CHECK (signer_role IN ('homeowner','contractor')),
  contract_snapshot jsonb NOT NULL,
  signature_payload jsonb,
  signer_ip text,
  signer_user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id,signer_role)
);
ALTER TABLE public.contract_acceptance_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contract_acceptance_evidence FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.contract_acceptance_evidence TO service_role;

CREATE FUNCTION public.sign_contract_atomic(p_contract_id uuid,p_signer_id uuid,p_signature jsonb,p_ip text,p_user_agent text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE; signer_role text; payer uuid; cosigners_ready boolean; result jsonb;
BEGIN
  SELECT * INTO c FROM public.contracts WHERE id=p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE='P0002'; END IF;
  SELECT payer_user_id INTO payer FROM public.jobs WHERE id=c.job_id;
  IF c.contractor_id=p_signer_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id=p_signer_id AND role='contractor') THEN
    signer_role := 'contractor';
  ELSIF (c.homeowner_id=p_signer_id OR payer=p_signer_id) AND EXISTS (SELECT 1 FROM public.profiles WHERE id=p_signer_id AND role='homeowner') THEN
    signer_role := 'homeowner';
  ELSE RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF c.status NOT IN ('pending_contractor','pending_homeowner') OR
     (signer_role='contractor' AND c.contractor_signed_at IS NOT NULL) OR
     (signer_role='homeowner' AND c.homeowner_signed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Contract no longer awaits this signature' USING ERRCODE='23514';
  END IF;
  IF p_signature IS NOT NULL AND
     (p_signature->>'signatureFormat' NOT IN ('svg','png') OR
      p_signature->>'platform' NOT IN ('web','mobile') OR
      coalesce(length(p_signature->>'signatureImage'),0) NOT BETWEEN 1 AND 524288) THEN
    RAISE EXCEPTION 'Invalid signature evidence' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.contract_acceptance_evidence(contract_id,signer_id,signer_role,contract_snapshot,signature_payload,signer_ip,signer_user_agent)
    VALUES(p_contract_id,p_signer_id,signer_role,to_jsonb(c),p_signature,p_ip,left(p_user_agent,1024));
  IF p_signature IS NOT NULL THEN
    INSERT INTO public.contract_signatures(contract_id,signer_id,signer_role,signature_image,signature_format,platform,signer_ip,signer_user_agent)
    VALUES(p_contract_id,p_signer_id,signer_role,p_signature->>'signatureImage',p_signature->>'signatureFormat',p_signature->>'platform',p_ip::inet,left(p_user_agent,1024));
  END IF;
  PERFORM 1 FROM public.contract_signatories WHERE contract_id=p_contract_id FOR UPDATE;
  SELECT NOT EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=p_contract_id AND signed_at IS NULL) INTO cosigners_ready;
  IF signer_role='contractor' THEN c.contractor_signed_at:=now(); ELSE c.homeowner_signed_at:=now(); END IF;
  c.status:=CASE WHEN c.contractor_signed_at IS NOT NULL AND c.homeowner_signed_at IS NOT NULL AND cosigners_ready THEN 'accepted'
    WHEN signer_role='contractor' THEN 'pending_homeowner' ELSE 'pending_contractor' END;
  UPDATE public.contracts SET contractor_signed_at=c.contractor_signed_at,homeowner_signed_at=c.homeowner_signed_at,status=c.status,updated_at=now() WHERE id=c.id;
  SELECT to_jsonb(r) INTO result FROM (SELECT id,job_id,contractor_id,homeowner_id,status,title,start_date,end_date,amount,contractor_signed_at,homeowner_signed_at,created_at,updated_at FROM public.contracts WHERE id=c.id) r;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sign_contract_atomic(uuid,uuid,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_atomic(uuid,uuid,jsonb,text,text) TO service_role;
