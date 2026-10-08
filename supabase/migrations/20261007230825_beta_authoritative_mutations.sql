-- Current web/mobile writers use authenticated APIs backed by service_role.
-- Keep reads intact, but do not let clients bypass API role/lifecycle checks.
BEGIN;

REVOKE INSERT ON public.jobs FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.reviews, public.organization_memberships, public.appointments
  FROM PUBLIC, anon, authenticated;

-- Table revocation alone does not remove any historical column-level grants.
DO $block$
DECLARE t text; cols text;
BEGIN
  FOREACH t IN ARRAY ARRAY['jobs','reviews','organization_memberships','appointments'] LOOP
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO cols
      FROM pg_attribute WHERE attrelid = format('public.%I',t)::regclass
      AND attnum > 0 AND NOT attisdropped;
    EXECUTE format('REVOKE INSERT (%s) ON public.%I FROM PUBLIC, anon, authenticated', cols,t);
    IF t <> 'jobs' THEN
      EXECUTE format('REVOKE UPDATE (%s), REFERENCES (%s) ON public.%I FROM PUBLIC, anon, authenticated',cols,cols,t);
    END IF;
  END LOOP;
END $block$;

-- Restrictive policies prevent an old permissive policy from reopening these
-- paths if a later migration accidentally restores a grant. Service roles
-- retain their existing privileges and RLS bypass for authorized API writes.
CREATE POLICY beta_jobs_api_insert ON public.jobs AS RESTRICTIVE
  FOR INSERT TO anon, authenticated WITH CHECK (false);
DO $block$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reviews','organization_memberships','appointments'] LOOP
    EXECUTE format('CREATE POLICY beta_api_insert ON public.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false)',t);
    EXECUTE format('CREATE POLICY beta_api_update ON public.%I AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)',t);
    EXECUTE format('CREATE POLICY beta_api_delete ON public.%I AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false)',t);
  END LOOP;
END $block$;

CREATE SCHEMA IF NOT EXISTS private;

-- Serialize removals through the parent row. A real UPDATE rather than only
-- a row lock also causes stale REPEATABLE READ transactions to abort, instead
-- of letting them count owners using an obsolete snapshot.
CREATE OR REPLACE FUNCTION private.guard_last_organization_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF OLD.status <> 'active' OR OLD.org_role <> 'owner' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active' AND NEW.org_role = 'owner'
       AND NEW.org_id = OLD.org_id AND NEW.user_id = OLD.user_id THEN
      RETURN NEW;
    END IF;
  END IF;

  UPDATE public.organizations SET id = id WHERE id = OLD.org_id;
  -- Intentional parent deletion cascades may remove the last membership.
  IF FOUND AND NOT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE org_id = OLD.org_id AND status = 'active' AND org_role = 'owner'
      AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot remove the last active organization owner'
      USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $function$;
REVOKE ALL ON FUNCTION private.guard_last_organization_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_last_organization_owner
  BEFORE UPDATE OR DELETE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION private.guard_last_organization_owner();

-- Scope job-attachment writes independently of jobs SELECT RLS, so an
-- authorized designated payer can upload even when not the homeowner.
CREATE OR REPLACE FUNCTION private.can_write_job_attachment(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    (storage.foldername(object_name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id::text = (storage.foldername(object_name))[1]
        AND auth.uid() IN (j.homeowner_id, j.contractor_id, j.payer_user_id)
    )
  );
$function$;
REVOKE ALL ON FUNCTION private.can_write_job_attachment(text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_write_job_attachment(text) TO authenticated;

-- Restrictive policies combine with existing ownership/dispute policies.
CREATE POLICY beta_attachment_insert_namespace ON storage.objects AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id <> 'job-attachments' OR private.can_write_job_attachment(name)
  );
CREATE POLICY beta_attachment_update_namespace ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (true) WITH CHECK (
    bucket_id <> 'job-attachments' OR
    (owner = auth.uid() AND private.can_write_job_attachment(name))
  );

COMMIT;
