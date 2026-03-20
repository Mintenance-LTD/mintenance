-- Migration: Ensure contractor_time_entries table exists
-- This table backs the /api/contractor/time-tracking route.
-- The original definition lives in 20260220000005_contractor_tools_time_insurance.sql
-- but may not have been applied in all environments.

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

-- RLS: contractors can only manage their own time entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contractor_time_entries'
      AND policyname = 'Contractor manages own time entries'
  ) THEN
    CREATE POLICY "Contractor manages own time entries"
      ON contractor_time_entries FOR ALL
      USING (contractor_id = auth.uid());
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_time_entries_contractor ON contractor_time_entries(contractor_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON contractor_time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON contractor_time_entries(job_id);
