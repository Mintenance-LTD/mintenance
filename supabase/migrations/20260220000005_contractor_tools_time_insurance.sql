-- Migration: contractor_tools, contractor_time_entries, contractor_insurance, contractor_licenses
-- These tables back the contractor Tools & Equipment, Time Tracking, and Insurance & Licensing pages.

-- ═══════════════════════════════════════════════════════════════
-- 1. Contractor Tools & Equipment
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contractor_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'hand_tools'
    CHECK (category IN ('power_tools', 'hand_tools', 'electrical', 'plumbing', 'safety', 'measuring', 'other')),
  manufacturer TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10, 2) DEFAULT 0 CHECK (purchase_price >= 0),
  current_value DECIMAL(10, 2) DEFAULT 0 CHECK (current_value >= 0),
  condition TEXT NOT NULL DEFAULT 'good'
    CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  location TEXT DEFAULT '',
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  warranty_expiry DATE,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contractor_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor manages own tools"
  ON contractor_tools FOR ALL
  USING (contractor_id = auth.uid());

CREATE INDEX idx_contractor_tools_contractor ON contractor_tools(contractor_id);
CREATE INDEX idx_contractor_tools_status ON contractor_tools(status);

-- ═══════════════════════════════════════════════════════════════
-- 2. Contractor Time Entries
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contractor_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  task_description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  hourly_rate DECIMAL(10, 2) DEFAULT 0 CHECK (hourly_rate >= 0),
  is_billable BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'stopped'
    CHECK (status IN ('running', 'stopped', 'invoiced')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contractor_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor manages own time entries"
  ON contractor_time_entries FOR ALL
  USING (contractor_id = auth.uid());

CREATE INDEX idx_time_entries_contractor ON contractor_time_entries(contractor_id);
CREATE INDEX idx_time_entries_date ON contractor_time_entries(date);
CREATE INDEX idx_time_entries_job ON contractor_time_entries(job_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. Contractor Insurance
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contractor_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  policy_number TEXT NOT NULL DEFAULT '',
  coverage_amount DECIMAL(14, 2) DEFAULT 0 CHECK (coverage_amount >= 0),
  premium DECIMAL(10, 2) DEFAULT 0 CHECK (premium >= 0),
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expiring_soon', 'expired')),
  document_url TEXT,
  document_storage_path TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contractor_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor manages own insurance"
  ON contractor_insurance FOR ALL
  USING (contractor_id = auth.uid());

CREATE INDEX idx_contractor_insurance_contractor ON contractor_insurance(contractor_id);
CREATE INDEX idx_contractor_insurance_expiry ON contractor_insurance(expiry_date);

-- ═══════════════════════════════════════════════════════════════
-- 4. Contractor Licenses
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contractor_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT NOT NULL DEFAULT '',
  issuer TEXT NOT NULL DEFAULT '',
  issue_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expiring_soon', 'expired')),
  document_url TEXT,
  document_storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contractor_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor manages own licenses"
  ON contractor_licenses FOR ALL
  USING (contractor_id = auth.uid());

CREATE INDEX idx_contractor_licenses_contractor ON contractor_licenses(contractor_id);
CREATE INDEX idx_contractor_licenses_expiry ON contractor_licenses(expiry_date);
