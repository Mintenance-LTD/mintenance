-- Portfolio Mode foundation (landlord/agent workflows)
-- Adds organization model + maintenance tickets + RLS policies

BEGIN;

-- 1) Core organization model
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL DEFAULT 'portfolio'
    CHECK (organization_type IN ('portfolio', 'agency', 'property_management')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_role TEXT NOT NULL
    CHECK (org_role IN ('owner', 'manager', 'maintenance_coordinator', 'tenant', 'accountant')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- 2) Extend properties with optional org scoping (backward compatible)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 3) Portfolio operational tables
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_label TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_footage INTEGER CHECK (square_footage IS NULL OR square_footage > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, unit_label)
);

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'triaged', 'in_progress', 'blocked', 'resolved', 'closed')),
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  update_type TEXT NOT NULL DEFAULT 'comment'
    CHECK (update_type IN ('comment', 'status_change', 'assignment', 'resolution')),
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'tenant_visible')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Performance indexes
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_active
  ON public.organization_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_active
  ON public.organization_memberships(org_id, status);
CREATE INDEX IF NOT EXISTS idx_properties_org_id
  ON public.properties(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_property
  ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_status
  ON public.leases(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_org_status
  ON public.maintenance_tickets(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_property
  ON public.maintenance_tickets(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_updates_ticket_created
  ON public.ticket_updates(ticket_id, created_at DESC);

-- 5) Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.org_id = p_org_id
      AND om.user_id = p_user_id
      AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_management_access(p_org_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.org_id = p_org_id
      AND om.user_id = p_user_id
      AND om.status = 'active'
      AND om.org_role IN ('owner', 'manager', 'maintenance_coordinator')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_management_access(UUID, UUID) TO authenticated, service_role;

-- 6) RLS policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select_member ON public.organizations;
CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT
  USING (
    public.is_org_member(id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS organizations_insert_creator ON public.organizations;
CREATE POLICY organizations_insert_creator ON public.organizations
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS organizations_update_owner_or_admin ON public.organizations;
CREATE POLICY organizations_update_owner_or_admin ON public.organizations
  FOR UPDATE
  USING (
    public.has_org_management_access(id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    public.has_org_management_access(id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS organization_memberships_select_member ON public.organization_memberships;
CREATE POLICY organization_memberships_select_member ON public.organization_memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_org_member(org_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS organization_memberships_manage_owner ON public.organization_memberships;
CREATE POLICY organization_memberships_manage_owner ON public.organization_memberships
  FOR ALL
  USING (
    public.has_org_management_access(org_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    public.has_org_management_access(org_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS properties_select_org_member ON public.properties;
CREATE POLICY properties_select_org_member ON public.properties
  FOR SELECT
  USING (
    org_id IS NOT NULL AND public.is_org_member(org_id)
  );

DROP POLICY IF EXISTS units_access_org_member ON public.units;
CREATE POLICY units_access_org_member ON public.units
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = units.property_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.properties p
      WHERE p.id = units.property_id
        AND p.org_id IS NOT NULL
        AND public.has_org_management_access(p.org_id)
    )
  );

DROP POLICY IF EXISTS leases_access_org_member ON public.leases;
CREATE POLICY leases_access_org_member ON public.leases
  FOR ALL
  USING (
    tenant_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = leases.unit_id
        AND p.org_id IS NOT NULL
        AND public.is_org_member(p.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties p ON p.id = u.property_id
      WHERE u.id = leases.unit_id
        AND p.org_id IS NOT NULL
        AND public.has_org_management_access(p.org_id)
    )
  );

DROP POLICY IF EXISTS maintenance_tickets_select_member ON public.maintenance_tickets;
CREATE POLICY maintenance_tickets_select_member ON public.maintenance_tickets
  FOR SELECT
  USING (
    reported_by = auth.uid()
    OR public.is_org_member(org_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS maintenance_tickets_insert_member ON public.maintenance_tickets;
CREATE POLICY maintenance_tickets_insert_member ON public.maintenance_tickets
  FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND public.is_org_member(org_id)
  );

DROP POLICY IF EXISTS maintenance_tickets_update_manager ON public.maintenance_tickets;
CREATE POLICY maintenance_tickets_update_manager ON public.maintenance_tickets
  FOR UPDATE
  USING (
    reported_by = auth.uid()
    OR public.has_org_management_access(org_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    reported_by = auth.uid()
    OR public.has_org_management_access(org_id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS ticket_updates_access_member ON public.ticket_updates;
CREATE POLICY ticket_updates_access_member ON public.ticket_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.maintenance_tickets t
      WHERE t.id = ticket_updates.ticket_id
        AND (t.reported_by = auth.uid() OR public.is_org_member(t.org_id))
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS ticket_updates_insert_member ON public.ticket_updates;
CREATE POLICY ticket_updates_insert_member ON public.ticket_updates
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_tickets t
      WHERE t.id = ticket_updates.ticket_id
        AND (t.reported_by = auth.uid() OR public.is_org_member(t.org_id))
    )
  );

COMMIT;
