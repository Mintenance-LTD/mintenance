-- Fix ERROR 42P17 "infinite recursion detected in policy for relation group_members".
-- The SELECT policy on group_members contained
--   EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id
--           AND gm.user_id = (select auth.uid()) AND gm.status = 'active')
-- i.e. it queried group_members itself, re-triggering its own policy. This made ANY
-- anon/authenticated query on group_members error, and took down every table whose
-- policies EXISTS-join group_members (group_events, group_discussions, contractor_groups).
-- Fix: SECURITY DEFINER helper (bypasses RLS on the inner lookup) with pinned search_path.
-- The helper is called with (select auth.uid()) explicitly so the auth_rls_initplan
-- advisor stays at 0 (a default-arg auth.uid() would be inlined per-row).
-- Original policy (verbatim USING clause) for rollback:
--   ((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1 FROM group_members gm
--     WHERE ((gm.group_id = group_members.group_id) AND (gm.user_id = ( SELECT auth.uid() AS uid))
--     AND ((gm.status)::text = 'active'::text)))))
-- Applied live via Supabase MCP on 2026-07-17 (version 20260717084959). Verified with a
-- seeded-then-rolled-back group: memberA/memberB see 2 memberships + event + private group,
-- authenticated non-member and anon see 0 with no errors.
CREATE OR REPLACE FUNCTION public.is_active_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND status::text = 'active'
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_active_group_member(uuid, uuid) FROM PUBLIC;
-- anon needs EXECUTE: the policy is TO public and function ACLs are checked at
-- expression init (see 20260716220600). Boolean membership check, nothing sensitive.
GRANT EXECUTE ON FUNCTION public.is_active_group_member(uuid, uuid) TO anon, authenticated, service_role;

DROP POLICY "Members can view group memberships" ON public.group_members;
CREATE POLICY "Members can view group memberships" ON public.group_members
  FOR SELECT TO public
  USING (
    (user_id = (select auth.uid()))
    OR public.is_active_group_member(group_id, (select auth.uid()))
  );
