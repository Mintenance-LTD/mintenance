-- ============================================================
-- Appointments & Contractor Availability Tables
-- Required by: /api/contractor/appointments, /api/contractor/availability
-- ============================================================

-- 1. Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER,
  location_type TEXT NOT NULL DEFAULT 'onsite' CHECK (location_type IN ('onsite', 'remote', 'phone')),
  location_address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-calculate duration_minutes from start/end time
CREATE OR REPLACE FUNCTION calculate_appointment_duration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_appointment_duration
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_appointment_duration();

-- 2. Contractor Availability table
CREATE TABLE IF NOT EXISTS contractor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contractor_id, day_of_week)
);

-- 3. Check appointment conflict function (used by POST /api/contractor/appointments)
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  contractor_uuid UUID,
  appt_date DATE,
  appt_start_time TIME,
  appt_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM appointments
    WHERE contractor_id = contractor_uuid
      AND appointment_date = appt_date
      AND status NOT IN ('cancelled', 'no_show')
      AND (
        (start_time < appt_end_time AND end_time > appt_start_time)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_contractor_id_status
  ON appointments (contractor_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON appointments (appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_contractor_date
  ON appointments (contractor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_contractor_availability_contractor_id
  ON contractor_availability (contractor_id);

-- 5. RLS Policies
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_availability ENABLE ROW LEVEL SECURITY;

-- Appointments: contractors can manage their own
CREATE POLICY "Contractors can view own appointments"
  ON appointments FOR SELECT
  USING (contractor_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Contractors can create own appointments"
  ON appointments FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "Contractors can update own appointments"
  ON appointments FOR UPDATE
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete own appointments"
  ON appointments FOR DELETE
  USING (contractor_id = auth.uid());

-- Service role bypass for appointments
CREATE POLICY "Service role full access to appointments"
  ON appointments FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Contractor Availability: contractors can manage their own
CREATE POLICY "Contractors can view own availability"
  ON contractor_availability FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can create own availability"
  ON contractor_availability FOR INSERT
  WITH CHECK (contractor_id = auth.uid());

CREATE POLICY "Contractors can update own availability"
  ON contractor_availability FOR UPDATE
  USING (contractor_id = auth.uid());

CREATE POLICY "Contractors can delete own availability"
  ON contractor_availability FOR DELETE
  USING (contractor_id = auth.uid());

-- Service role bypass for availability
CREATE POLICY "Service role full access to contractor_availability"
  ON contractor_availability FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
