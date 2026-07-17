-- group_members had INSERT/SELECT/UPDATE policies but no DELETE policy, so nobody could
-- leave a group (or be removed) through the client — deletes were deny-all.
-- Add: members can delete their own membership (leave); active group admins can remove
-- members (kick). The admin check MUST go through a SECURITY DEFINER helper — a plain
-- EXISTS on group_members inside its own policy is the 42P17 recursion fixed in
-- 20260717084959. Policy is TO authenticated (anon keeps deny-all; also avoids the
-- expression-init function-ACL pitfall documented in 20260716220600).
-- Applied live via Supabase MCP on 2026-07-17 (version 20260717145813). Verified with a
-- seeded-then-rolled-back group: member-kicks-other deleted 0 rows, member-leaves-self 1,
-- group-admin-kicks-member 1, anon-delete-all 0.
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND status::text = 'active'
      AND role::text = 'admin'
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_group_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Members can leave and admins can remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    (user_id = (select auth.uid()))
    OR public.is_group_admin(group_id, (select auth.uid()))
  );
