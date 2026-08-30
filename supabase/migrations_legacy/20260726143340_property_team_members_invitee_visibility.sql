-- property_team_members: let an invited person actually see their own invite.
--
-- The only policy on this table was "Property owner manages team" (FOR ALL,
-- owner-scoped), so the invitee could never read the row addressed to them and
-- therefore could never accept it. The invite UI even carries a fallback
-- message reading "Invite recorded — activation pathway pending". The table has
-- zero rows in production, which is what an unusable feature looks like.
--
-- Structure: the single FOR ALL policy is split into explicit per-command
-- policies so the SELECT branch can widen to include the invitee WITHOUT
-- introducing a second permissive policy for any command. The 2026-07-16
-- consolidation drove multiple_permissive_policies to 0 platform-wide and this
-- keeps it there (one permissive policy per command on this table).
--
-- Writes stay owner-only on purpose. Accept/decline goes through
-- POST /api/properties/invites with the service role after verifying the
-- caller's email against profiles -- if the invitee could UPDATE their own row
-- directly they could also rewrite `role` and escalate themselves to admin.
--
-- Also narrows the role from `public` to `authenticated`: anon has no business
-- reading team membership.

DROP POLICY IF EXISTS "Property owner manages team" ON public.property_team_members;

-- SELECT: the property owner, or the person the invite is addressed to.
CREATE POLICY property_team_members_select ON public.property_team_members
  FOR SELECT TO authenticated
  USING (
    property_id IN (
      SELECT properties.id FROM public.properties
      WHERE properties.owner_id = (select auth.uid())
    )
    OR user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND lower(p.email) = lower(property_team_members.email)
    )
  );

CREATE POLICY property_team_members_insert ON public.property_team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (
      SELECT properties.id FROM public.properties
      WHERE properties.owner_id = (select auth.uid())
    )
  );

CREATE POLICY property_team_members_update ON public.property_team_members
  FOR UPDATE TO authenticated
  USING (
    property_id IN (
      SELECT properties.id FROM public.properties
      WHERE properties.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT properties.id FROM public.properties
      WHERE properties.owner_id = (select auth.uid())
    )
  );

CREATE POLICY property_team_members_delete ON public.property_team_members
  FOR DELETE TO authenticated
  USING (
    property_id IN (
      SELECT properties.id FROM public.properties
      WHERE properties.owner_id = (select auth.uid())
    )
  );;
