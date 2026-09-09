CREATE FUNCTION public.freeze_signed_contract_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE field text;
BEGIN
  IF OLD.contractor_signed_at IS NOT NULL OR OLD.homeowner_signed_at IS NOT NULL OR
     EXISTS(SELECT 1 FROM public.contract_signatories WHERE contract_id=OLD.id AND signed_at IS NOT NULL) OR
     EXISTS(SELECT 1 FROM public.contract_acceptance_evidence WHERE contract_id=OLD.id) THEN
    FOREACH field IN ARRAY ARRAY['job_id','homeowner_id','contractor_id','amount','title','description','terms','start_date','end_date','quote_id','contractor_company_name','contractor_license_registration','contractor_license_type'] LOOP
      IF to_jsonb(NEW)->field IS DISTINCT FROM to_jsonb(OLD)->field THEN
        RAISE EXCEPTION 'Signed contract terms cannot be changed' USING ERRCODE='23514';
      END IF;
    END LOOP;
    IF (OLD.contractor_signed_at IS NOT NULL AND NEW.contractor_signed_at IS DISTINCT FROM OLD.contractor_signed_at) OR
       (OLD.homeowner_signed_at IS NOT NULL AND NEW.homeowner_signed_at IS DISTINCT FROM OLD.homeowner_signed_at) THEN
      RAISE EXCEPTION 'Existing contract signatures cannot be changed' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.freeze_signed_contract_terms() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER freeze_signed_contract_terms BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.freeze_signed_contract_terms();
