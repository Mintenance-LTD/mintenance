-- Migration: Property Premium Features
-- Adds tables for Recurring Maintenance, Tenant Contacts, and Team Access

-- Recurring Maintenance Schedules
CREATE TABLE IF NOT EXISTS recurring_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE NOT NULL,
  last_completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property Tenants
CREATE TABLE IF NOT EXISTS property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lease_start DATE,
  lease_end DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property Team Members
CREATE TABLE IF NOT EXISTS property_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE recurring_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_team_members ENABLE ROW LEVEL SECURITY;

-- Owner access policies (property owner can manage all)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Property owner manages schedules') THEN
    CREATE POLICY "Property owner manages schedules" ON recurring_maintenance_schedules
      FOR ALL USING (property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Property owner manages tenants') THEN
    CREATE POLICY "Property owner manages tenants" ON property_tenants
      FOR ALL USING (property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Property owner manages team') THEN
    CREATE POLICY "Property owner manages team" ON property_team_members
      FOR ALL USING (property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid()));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_property ON recurring_maintenance_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_due ON recurring_maintenance_schedules(next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenants_property ON property_tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_team_members_property ON property_team_members(property_id);
