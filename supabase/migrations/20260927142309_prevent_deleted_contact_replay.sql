-- Preserve consumed contact identities without retaining contact details.
-- No FK: deleting the contact/property/account must not make an old operation reusable.
CREATE TABLE public.property_contact_save_ids (id uuid PRIMARY KEY);
ALTER TABLE public.property_contact_save_ids ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_contact_save_ids FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.property_contact_save_ids TO service_role;

LOCK TABLE public.property_tenants IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.property_contact_save_ids(id) SELECT id FROM public.property_tenants;

CREATE FUNCTION public.reserve_property_contact_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Contact identity cannot be changed' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  -- The unique key serializes concurrent submissions. A failed contact INSERT
  -- rolls this reservation back; a successful INSERT consumes the ID permanently.
  INSERT INTO public.property_contact_save_ids(id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_property_contact_identity() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER reserve_property_contact_identity
BEFORE INSERT OR UPDATE OF id ON public.property_tenants
FOR EACH ROW EXECUTE FUNCTION public.reserve_property_contact_identity();

COMMENT ON TABLE public.property_contact_save_ids IS
'Consumed contact UUIDs only; retained to reject delayed replays after deletion. No names, contact details, property IDs, account IDs or payloads.';
