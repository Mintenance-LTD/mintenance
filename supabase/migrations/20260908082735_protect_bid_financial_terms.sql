CREATE FUNCTION public.protect_bid_financial_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  -- Acceptance fixes the economic identity, even for a racing server edit.
  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND
     (NEW.amount IS DISTINCT FROM OLD.amount OR
      NEW.job_id IS DISTINCT FROM OLD.job_id OR
      NEW.contractor_id IS DISTINCT FROM OLD.contractor_id) THEN
    RAISE EXCEPTION 'Accepted bid financial terms are immutable' USING ERRCODE='23514';
  END IF;

  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' OR NEW.contractor_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Clients may only submit their own pending bids' USING ERRCODE='42501';
      END IF;
    ELSE
      IF OLD.status IS DISTINCT FROM 'pending' OR OLD.contractor_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Only the contractor may change a pending bid' USING ERRCODE='42501';
      END IF;
      IF TG_OP = 'UPDATE' AND
         (NEW.job_id IS DISTINCT FROM OLD.job_id OR
          NEW.contractor_id IS DISTINCT FROM OLD.contractor_id OR
          NEW.status NOT IN ('pending', 'withdrawn')) THEN
        RAISE EXCEPTION 'Bid identity and acceptance require a trusted operation' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_bid_financial_terms() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_bid_financial_terms BEFORE INSERT OR UPDATE OR DELETE ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.protect_bid_financial_terms();
