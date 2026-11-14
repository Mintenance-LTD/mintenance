-- Preserve unknown historical dates; only record new observed transitions.
ALTER TABLE public.bids ADD COLUMN accepted_at timestamptz;
ALTER TABLE public.escrow_transactions ADD COLUMN funded_at timestamptz;
CREATE FUNCTION public.record_bid_acceptance_time() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.accepted_at:=CASE WHEN NEW.status='accepted' THEN clock_timestamp() END;
 ELSIF NEW.status='accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN NEW.accepted_at:=clock_timestamp();
 ELSE NEW.accepted_at:=OLD.accepted_at; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER record_bid_acceptance_time BEFORE INSERT OR UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.record_bid_acceptance_time();
CREATE FUNCTION public.record_escrow_funding_time() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.funded_at:=CASE WHEN NEW.status='held' THEN clock_timestamp() END;
 ELSIF NEW.status='held' AND OLD.status IN ('pending','failed','cancelled','canceled') AND OLD.funded_at IS NULL THEN NEW.funded_at:=clock_timestamp();
 ELSE NEW.funded_at:=OLD.funded_at; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER record_escrow_funding_time BEFORE INSERT OR UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.record_escrow_funding_time();
REVOKE ALL ON FUNCTION public.record_bid_acceptance_time(),public.record_escrow_funding_time() FROM PUBLIC,anon,authenticated,service_role;
