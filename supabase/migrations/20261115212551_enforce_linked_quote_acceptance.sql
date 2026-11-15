-- Validate the linked quote inside the bid acceptance transaction, including direct RPC calls.
CREATE OR REPLACE FUNCTION public.check_bid_quote_acceptance()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE q public.contractor_quotes%ROWTYPE;
BEGIN
  IF NEW.status <> 'accepted' OR NEW.quote_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' AND OLD.quote_id IS NOT DISTINCT FROM NEW.quote_id THEN RETURN NEW; END IF;
  SELECT * INTO q FROM public.contractor_quotes WHERE id = NEW.quote_id AND contractor_id = NEW.contractor_id FOR UPDATE;
  IF NOT FOUND OR q.status NOT IN ('sent', 'viewed') OR q.valid_until < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date THEN
    RAISE EXCEPTION 'Linked quote is not available for acceptance; request an updated quote' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.check_bid_quote_acceptance() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS check_bid_quote_acceptance ON public.bids;
CREATE TRIGGER check_bid_quote_acceptance BEFORE INSERT OR UPDATE OF status, quote_id ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.check_bid_quote_acceptance();
