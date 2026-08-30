BEGIN;

-- Newsletter links previously embedded the subscriber's email address even
-- though the unsubscribe endpoint accepts only an opaque UUID token. Give
-- every existing and future subscription its own token.
ALTER TABLE public.newsletter_subscriptions
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid;

UPDATE public.newsletter_subscriptions
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

ALTER TABLE public.newsletter_subscriptions
  ALTER COLUMN unsubscribe_token SET DEFAULT gen_random_uuid(),
  ALTER COLUMN unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscriptions_unsubscribe_token_key
  ON public.newsletter_subscriptions (unsubscribe_token);

-- These SECURITY DEFINER helpers exist to avoid RLS recursion. Their user-id
-- parameters were callable with arbitrary UUIDs, however, which exposed
-- membership and role checks as an enumeration oracle. Keep the signatures
-- required by existing policies, but bind every check to the authenticated
-- identity. Service-role callers bypass RLS and do not need arbitrary helper
-- lookups.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT check_user_id IS NOT NULL
    AND check_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = check_user_id
        AND role = 'admin'
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_org_member(
  p_org_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS om
      WHERE om.org_id = p_org_id
        AND om.user_id = p_user_id
        AND om.status = 'active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.has_org_management_access(
  p_org_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships AS om
      WHERE om.org_id = p_org_id
        AND om.user_id = p_user_id
        AND om.status = 'active'
        AND om.org_role IN ('owner', 'manager', 'maintenance_coordinator')
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_company_admin(
  p_company_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.company_team_members
      WHERE company_id = p_company_id
        AND user_id = p_user_id
        AND role = 'admin'
        AND can_manage_team = true
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_active_group_member(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.group_members
      WHERE group_id = p_group_id
        AND user_id = p_user_id
        AND status::text = 'active'
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_group_admin(
  p_group_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p_user_id IS NOT NULL
    AND p_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.group_members
      WHERE group_id = p_group_id
        AND user_id = p_user_id
        AND status::text = 'active'
        AND role::text = 'admin'
    );
$function$;

-- PUBLIC receives EXECUTE on functions by default in PostgreSQL. Revoke that
-- implicit access, then grant only the roles needed by current TO-public RLS
-- policies. A later policy-consolidation migration can move these helpers to a
-- private schema without coupling that larger change to this security fix.
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_org_management_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_group_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_admin(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_management_access(uuid, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_group_member(uuid, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid)
  TO authenticated, service_role;

COMMIT;
