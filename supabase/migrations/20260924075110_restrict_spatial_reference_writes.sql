-- Managed PostGIS tables are owned by supabase_admin. Hosted postgres has
-- TRIGGER privilege but neither ownership nor grant options, so a REVOKE/RLS
-- change cannot reliably remove the platform's client write grants here.
-- A SECURITY INVOKER statement trigger blocks writes before touching any rows.
-- Reference reads and trusted database/extension maintenance remain available.
CREATE FUNCTION public.guard_spatial_reference_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF current_user NOT IN ('postgres','supabase_admin') THEN
  RAISE EXCEPTION 'Coordinate reference data is read-only' USING ERRCODE='42501';
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.guard_spatial_reference_writes() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_spatial_reference_writes
BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.spatial_ref_sys
FOR EACH STATEMENT EXECUTE FUNCTION public.guard_spatial_reference_writes();
