-- Landlord & Agency Features Migration
-- Adds compliance tracking, anonymous tenant reporting, recurring maintenance,
-- and expands homeowner subscription tiers to support landlord/agency plans.

BEGIN;

-- Ensure pgcrypto extension is available (needed for gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================================
-- 1) Expand homeowner subscription plan types
-- ============================================================================

-- Drop the existing check constraint on plan_type and add new tiers
ALTER TABLE public.homeowner_subscriptions
  DROP CONSTRAINT IF EXISTS homeowner_subscriptions_plan_type_check;

ALTER TABLE public.homeowner_subscriptions
  ADD CONSTRAINT homeowner_subscriptions_plan_type_check
    CHECK (plan_type IN ('landlord', 'agency'));

COMMENT ON TABLE public.homeowner_subscriptions IS
  'Homeowner subscription tiers: landlord (£24.99/mo), agency (£49.99/mo). Free tier has no subscription row.';

-- ============================================================================
-- 2) Compliance certificates (per-property safety/legal tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Certificate type
  cert_type TEXT NOT NULL CHECK (cert_type IN (
    'gas_safety',        -- Annual CP12 certificate
    'eicr',              -- Electrical Installation Condition Report (5-year)
    'epc',               -- Energy Performance Certificate (10-year)
    'smoke_alarm',       -- Smoke alarm compliance
    'co_detector',       -- Carbon monoxide detector compliance
    'legionella',        -- Legionella risk assessment
    'fire_safety',       -- Fire safety assessment (HMO)
    'asbestos',          -- Asbestos survey
    'pat_testing'        -- Portable appliance testing
  )),

  -- Certificate details
  certificate_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  issuer_name TEXT,
  issuer_registration TEXT,   -- e.g. Gas Safe registration number

  -- Document storage
  document_url TEXT,          -- Supabase Storage URL for PDF/image
  document_storage_path TEXT, -- Storage bucket path

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN (
    'valid',      -- Certificate is current
    'expiring',   -- Within 90 days of expiry
    'expired',    -- Past expiry date
    'missing'     -- No certificate on file
  )),

  -- Reminder tracking
  reminder_90d_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_30d_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_7d_sent BOOLEAN NOT NULL DEFAULT FALSE,

  -- Link to auto-created job for renewal
  renewal_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active certificate per type per property
  UNIQUE (property_id, cert_type)
);

CREATE INDEX IF NOT EXISTS idx_compliance_certs_property
  ON public.compliance_certificates(property_id);

CREATE INDEX IF NOT EXISTS idx_compliance_certs_owner
  ON public.compliance_certificates(owner_id);

CREATE INDEX IF NOT EXISTS idx_compliance_certs_expiry
  ON public.compliance_certificates(expiry_date)
  WHERE status IN ('valid', 'expiring');

CREATE INDEX IF NOT EXISTS idx_compliance_certs_status
  ON public.compliance_certificates(status)
  WHERE status IN ('expiring', 'expired', 'missing');

-- ============================================================================
-- 3) Anonymous tenant reporting tokens (shareable links per property)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_report_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Token for the shareable URL: /report/{token}
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),

  -- Configuration
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  label TEXT,  -- e.g. "Flat 2A reporting link"

  -- Usage tracking
  total_reports INTEGER NOT NULL DEFAULT 0,
  last_report_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_report_tokens_token
  ON public.anonymous_report_tokens(token);

CREATE INDEX IF NOT EXISTS idx_report_tokens_property
  ON public.anonymous_report_tokens(property_id);

CREATE INDEX IF NOT EXISTS idx_report_tokens_owner
  ON public.anonymous_report_tokens(owner_id);

-- ============================================================================
-- 4) Anonymous maintenance reports (submitted by tenants via shareable link)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES public.anonymous_report_tokens(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,

  -- Reporter info (not a user account)
  reporter_name TEXT NOT NULL,
  reporter_phone TEXT,
  reporter_email TEXT,
  reporter_unit TEXT,  -- e.g. "Flat 2A"

  -- Issue details
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'plumbing',
    'electrical',
    'heating',
    'structural',
    'damp_mould',
    'pest_control',
    'appliance',
    'door_window',
    'roof_guttering',
    'garden_exterior',
    'fire_safety',
    'general'
  )),
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  photos TEXT[],  -- Array of storage URLs

  -- Processing status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',           -- Just submitted
    'acknowledged',  -- Landlord has seen it
    'converted',     -- Converted to a job
    'resolved',      -- Issue resolved
    'dismissed'      -- Not actionable
  )),

  -- Link to created job (if converted)
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,

  -- Landlord response
  landlord_notes TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_reports_token
  ON public.anonymous_reports(token_id);

CREATE INDEX IF NOT EXISTS idx_anon_reports_property
  ON public.anonymous_reports(property_id);

CREATE INDEX IF NOT EXISTS idx_anon_reports_status
  ON public.anonymous_reports(status)
  WHERE status IN ('new', 'acknowledged');

-- ============================================================================
-- 5) Recurring maintenance schedules
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Schedule definition
  task_type TEXT NOT NULL,        -- e.g. 'boiler_service', 'gutter_cleaning', 'garden_maintenance'
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',

  -- Frequency
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'biannual', 'annual')),
  next_due_date DATE NOT NULL,
  last_completed_date DATE,

  -- Auto-creation
  auto_create_job BOOLEAN NOT NULL DEFAULT FALSE,
  auto_job_budget_min NUMERIC(10,2),
  auto_job_budget_max NUMERIC(10,2),

  -- Link to last created job
  last_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Reminder settings
  remind_days_before INTEGER NOT NULL DEFAULT 14,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_property
  ON public.recurring_schedules(property_id);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_owner
  ON public.recurring_schedules(owner_id);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_due
  ON public.recurring_schedules(next_due_date)
  WHERE is_active = TRUE;

-- ============================================================================
-- 6) Property contacts (lightweight tenant/keyholder records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.property_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Contact info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_role TEXT NOT NULL DEFAULT 'tenant' CHECK (contact_role IN (
    'tenant', 'keyholder', 'emergency_contact', 'managing_agent'
  )),

  -- Tenancy info (optional)
  unit_label TEXT,           -- e.g. "Flat 2A"
  move_in_date DATE,
  lease_end_date DATE,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_contacts_property
  ON public.property_contacts(property_id);

CREATE INDEX IF NOT EXISTS idx_property_contacts_owner
  ON public.property_contacts(owner_id);

CREATE INDEX IF NOT EXISTS idx_property_contacts_lease_end
  ON public.property_contacts(lease_end_date)
  WHERE is_active = TRUE AND lease_end_date IS NOT NULL;

-- ============================================================================
-- 7) RLS Policies
-- ============================================================================

-- Compliance certificates: owner can CRUD, admin can read all
ALTER TABLE public.compliance_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_certs_owner_all ON public.compliance_certificates
  FOR ALL
  USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY compliance_certs_service_role ON public.compliance_certificates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous report tokens: owner can CRUD
ALTER TABLE public.anonymous_report_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_tokens_owner_all ON public.anonymous_report_tokens
  FOR ALL
  USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY report_tokens_service_role ON public.anonymous_report_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous reports: owner sees reports for their properties, anyone can insert via service_role
ALTER TABLE public.anonymous_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_reports_owner_read ON public.anonymous_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.anonymous_report_tokens t
      WHERE t.id = anonymous_reports.token_id
        AND t.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY anon_reports_owner_update ON public.anonymous_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.anonymous_report_tokens t
      WHERE t.id = anonymous_reports.token_id
        AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.anonymous_report_tokens t
      WHERE t.id = anonymous_reports.token_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY anon_reports_service_role ON public.anonymous_reports
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Recurring schedules: owner can CRUD
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_schedules_owner_all ON public.recurring_schedules
  FOR ALL
  USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY recurring_schedules_service_role ON public.recurring_schedules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Property contacts: owner can CRUD
ALTER TABLE public.property_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_contacts_owner_all ON public.property_contacts
  FOR ALL
  USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY property_contacts_service_role ON public.property_contacts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8) Auto-update updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'compliance_certificates',
    'anonymous_report_tokens',
    'anonymous_reports',
    'recurring_schedules',
    'property_contacts'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I; '
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;

COMMIT;
