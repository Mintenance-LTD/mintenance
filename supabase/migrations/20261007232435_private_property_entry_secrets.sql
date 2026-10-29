BEGIN;
LOCK TABLE public.properties IN ACCESS EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.property_entry_secrets (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id)
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  key_safe_code text NOT NULL
);
ALTER TABLE private.property_entry_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.property_entry_secrets FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.property_entry_secrets TO service_role;
INSERT INTO private.property_entry_secrets(property_id,key_safe_code)
  SELECT id,key_safe_code FROM public.properties WHERE key_safe_code IS NOT NULL;
UPDATE public.properties SET key_safe_code = NULL WHERE key_safe_code IS NOT NULL;

-- Preserve SELECT * compatibility, but keep the public column always NULL.
-- Existing authorized API writes redirect into the private table atomically.
CREATE FUNCTION private.store_property_entry_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
BEGIN
  IF TG_OP = 'UPDATE' OR NEW.key_safe_code IS NOT NULL THEN
    IF current_user IN ('anon','authenticated') THEN
      RAISE EXCEPTION 'Use the authorized property access endpoint' USING ERRCODE = '42501';
    END IF;
    IF NEW.key_safe_code IS NULL THEN
      DELETE FROM private.property_entry_secrets WHERE property_id = NEW.id;
    ELSE
      INSERT INTO private.property_entry_secrets(property_id,key_safe_code)
        VALUES(NEW.id,NEW.key_safe_code)
        ON CONFLICT(property_id) DO UPDATE SET key_safe_code = EXCLUDED.key_safe_code;
    END IF;
  END IF;
  NEW.key_safe_code = NULL;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION private.store_property_entry_secret() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER store_property_entry_secret
  BEFORE INSERT OR UPDATE OF key_safe_code ON public.properties
  FOR EACH ROW EXECUTE FUNCTION private.store_property_entry_secret();
ALTER TABLE public.properties ADD CONSTRAINT property_entry_secret_not_public CHECK (key_safe_code IS NULL);

-- Service-only RPC. p_actor_id must be bound to the authenticated API session.
-- Owner/admin access and contractor assignment/timing are also checked here.
CREATE FUNCTION public.read_property_entry_secret(
  p_property_id uuid, p_actor_id uuid, p_job_id uuid DEFAULT NULL
) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT s.key_safe_code FROM private.property_entry_secrets s
  JOIN public.properties p ON p.id = s.property_id
  WHERE s.property_id = p_property_id AND p_actor_id IS NOT NULL AND (
    p.owner_id = p_actor_id
    OR EXISTS (SELECT 1 FROM public.profiles u WHERE u.id = p_actor_id AND u.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = p_job_id AND j.property_id = p_property_id
        AND j.contractor_id = p_actor_id
        AND (j.status = 'in_progress' OR
          (j.status = 'assigned' AND j.scheduled_start_date IS NOT NULL
            AND now() >= j.scheduled_start_date - interval '1 hour'))
    )
  );
$function$;
REVOKE ALL ON FUNCTION public.read_property_entry_secret(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_property_entry_secret(uuid,uuid,uuid) TO service_role;
COMMIT;
