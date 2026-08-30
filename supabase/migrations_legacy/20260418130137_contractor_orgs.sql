
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_organization_type_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_organization_type_check
  CHECK (organization_type = ANY (ARRAY[
    'portfolio'::text,
    'agency'::text,
    'property_management'::text,
    'contractor_company'::text
  ]));

ALTER TABLE public.organization_memberships
  DROP CONSTRAINT IF EXISTS organization_memberships_org_role_check;

ALTER TABLE public.organization_memberships
  ADD CONSTRAINT organization_memberships_org_role_check
  CHECK (org_role = ANY (ARRAY[
    'owner'::text,
    'manager'::text,
    'maintenance_coordinator'::text,
    'tenant'::text,
    'accountant'::text,
    'dispatcher'::text,
    'field'::text
  ]));

CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_status
  ON public.organization_memberships (user_id, status);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email      TEXT        NOT NULL,
  org_role           TEXT        NOT NULL CHECK (org_role IN ('owner','manager','maintenance_coordinator','accountant','dispatcher','field')),
  invitation_token   UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accepted_at        TIMESTAMPTZ NULL,
  accepted_by        UUID        NULL REFERENCES public.profiles(id),
  revoked_at         TIMESTAMPTZ NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_org
  ON public.organization_invitations (org_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email
  ON public.organization_invitations (invited_email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_invitations_admin_manage ON public.organization_invitations;
CREATE POLICY organization_invitations_admin_manage
  ON public.organization_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.org_id = organization_invitations.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.org_role IN ('owner','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_memberships m
      WHERE m.org_id = organization_invitations.org_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.org_role IN ('owner','manager')
    )
  );

DROP POLICY IF EXISTS organization_invitations_invitee_read ON public.organization_invitations;
CREATE POLICY organization_invitations_invitee_read
  ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    accepted_at IS NULL
    AND revoked_at IS NULL
    AND lower(invited_email) = (
      SELECT lower(email) FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS organization_invitations_service_role ON public.organization_invitations;
CREATE POLICY organization_invitations_service_role
  ON public.organization_invitations
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS organization_invitations_set_updated_at ON public.organization_invitations;
CREATE TRIGGER organization_invitations_set_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
;
