-- No historical bids or signed agreements are rewritten.
ALTER TABLE public.bids ALTER COLUMN materials_included DROP DEFAULT;
ALTER TABLE public.bids ALTER COLUMN warranty_months DROP DEFAULT;

CREATE FUNCTION public.guard_explicit_contract_obligations()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Accepted-bid drafts previously inherited promises from database defaults.
    -- Require the contractor to prepare and review the actual job's terms.
    IF NEW.terms->>'created_from' = 'bid_acceptance' THEN
      NEW.terms := coalesce(NEW.terms, '{}'::jsonb) - 'materials_included' - 'warranty_months';
    END IF;
  ELSIF OLD.contractor_signed_at IS NOT NULL OR OLD.homeowner_signed_at IS NOT NULL THEN
    -- Preserve agreements already signed by either party; existing guards
    -- continue to protect their contents and enforce review tokens.
    RETURN NEW;
  END IF;

  IF NEW.contractor_signed_at IS NOT NULL OR NEW.homeowner_signed_at IS NOT NULL THEN
    IF jsonb_typeof(NEW.terms->'materials_terms') IS DISTINCT FROM 'string'
      OR jsonb_typeof(NEW.terms->'warranty_terms') IS DISTINCT FROM 'string'
      OR coalesce(length(btrim(NEW.terms->>'materials_terms')), 0) NOT BETWEEN 1 AND 2000
      OR coalesce(length(btrim(NEW.terms->>'warranty_terms')), 0) NOT BETWEEN 1 AND 2000 THEN
      RAISE EXCEPTION 'Prepare explicit materials and warranty terms before signing'
        USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_explicit_contract_obligations() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_explicit_contract_obligations BEFORE INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_explicit_contract_obligations();
