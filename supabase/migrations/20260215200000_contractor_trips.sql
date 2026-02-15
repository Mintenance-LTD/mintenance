-- ============================================================
-- Contractor Trips - "On My Way" tracking
-- Tracks when contractors are en route to jobs/appointments
-- ============================================================

CREATE TABLE IF NOT EXISTS contractor_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  trip_type TEXT NOT NULL DEFAULT 'job_visit' CHECK (trip_type IN ('job_visit', 'appointment', 'inspection')),
  status TEXT NOT NULL DEFAULT 'en_route' CHECK (status IN ('en_route', 'arrived', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  destination_address TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  eta_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_trips_contractor_status
  ON contractor_trips (contractor_id, status);

CREATE INDEX IF NOT EXISTS idx_contractor_trips_job
  ON contractor_trips (job_id, status)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contractor_trips_appointment
  ON contractor_trips (appointment_id, status)
  WHERE appointment_id IS NOT NULL;

-- RLS
ALTER TABLE contractor_trips ENABLE ROW LEVEL SECURITY;

-- Contractors can manage their own trips
CREATE POLICY "Contractors can manage own trips"
  ON contractor_trips FOR ALL
  USING (contractor_id = auth.uid());

-- Homeowners can view trips for their jobs
CREATE POLICY "Homeowners can view trips for their jobs"
  ON contractor_trips FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM jobs WHERE homeowner_id = auth.uid()
    )
  );

-- Admins can view all trips
CREATE POLICY "Admins can view all trips"
  ON contractor_trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass
CREATE POLICY "Service role full access to contractor_trips"
  ON contractor_trips FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
