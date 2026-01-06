-- Migration: Add Appointments and Availability Tables
-- Created: 2025-12-03
-- Description: Creates tables for contractor scheduling, appointments, and availability

-- ============================================================================
-- 1. CONTRACTOR_AVAILABILITY TABLE - For working hours and availability
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Day of week (0 = Sunday, 6 = Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Time slots
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Status
    is_available BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure start time is before end time
    CHECK (start_time < end_time),

    -- Unique constraint: one availability per contractor per day
    UNIQUE(contractor_id, day_of_week)
);

CREATE INDEX idx_contractor_availability_contractor_id ON contractor_availability(contractor_id);
CREATE INDEX idx_contractor_availability_day ON contractor_availability(day_of_week);

COMMENT ON TABLE contractor_availability IS 'Stores contractor weekly availability schedule';
COMMENT ON COLUMN contractor_availability.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';

-- ============================================================================
-- 2. APPOINTMENTS TABLE - For scheduled meetings/consultations
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parties involved
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Appointment details
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Client information (for appointments not linked to registered users)
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),

    -- Scheduling
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER,

    -- Location
    location_type VARCHAR(50) DEFAULT 'onsite' CHECK (location_type IN ('onsite', 'video', 'phone')),
    location_address TEXT,
    video_call_url TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),

    -- Notes
    notes TEXT,
    cancellation_reason TEXT,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Ensure start time is before end time
    CHECK (start_time < end_time)
);

CREATE INDEX idx_appointments_contractor_id ON appointments(contractor_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_job_id ON appointments(job_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_contractor_date ON appointments(contractor_id, appointment_date);

COMMENT ON TABLE appointments IS 'Stores scheduled appointments, consultations, and site visits';
COMMENT ON COLUMN appointments.location_type IS 'Type of appointment: onsite (physical location), video (video call), or phone (phone call)';
COMMENT ON COLUMN appointments.duration_minutes IS 'Calculated duration in minutes based on start_time and end_time';

-- ============================================================================
-- 3. APPOINTMENT_SLOTS TABLE - For pre-defined available time slots
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Slot details
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Status
    is_booked BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false, -- Blocked by contractor for personal time

    -- Link to appointment if booked
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (start_time < end_time),
    UNIQUE(contractor_id, slot_date, start_time)
);

CREATE INDEX idx_appointment_slots_contractor_id ON appointment_slots(contractor_id);
CREATE INDEX idx_appointment_slots_date ON appointment_slots(slot_date);
CREATE INDEX idx_appointment_slots_available ON appointment_slots(is_booked, is_blocked) WHERE is_booked = false AND is_blocked = false;

COMMENT ON TABLE appointment_slots IS 'Stores individual time slots that contractors can offer for booking';

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE contractor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

-- CONTRACTOR_AVAILABILITY Policies
CREATE POLICY "Contractors can manage their own availability" ON contractor_availability
    FOR ALL USING (contractor_id = auth.uid());

CREATE POLICY "Anyone can view contractor availability" ON contractor_availability
    FOR SELECT USING (is_available = true);

-- APPOINTMENTS Policies
CREATE POLICY "Contractors can manage their appointments" ON appointments
    FOR ALL USING (contractor_id = auth.uid());

CREATE POLICY "Clients can view their appointments" ON appointments
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients can create appointments" ON appointments
    FOR INSERT WITH CHECK (client_id = auth.uid() OR client_id IS NULL);

CREATE POLICY "Users can update their own appointments" ON appointments
    FOR UPDATE USING (
        contractor_id = auth.uid() OR
        client_id = auth.uid()
    );

-- APPOINTMENT_SLOTS Policies
CREATE POLICY "Contractors can manage their slots" ON appointment_slots
    FOR ALL USING (contractor_id = auth.uid());

CREATE POLICY "Anyone can view available slots" ON appointment_slots
    FOR SELECT USING (is_booked = false AND is_blocked = false);

-- ============================================================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

CREATE TRIGGER update_contractor_availability_updated_at BEFORE UPDATE ON contractor_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_slots_updated_at BEFORE UPDATE ON appointment_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. FUNCTIONS FOR APPOINTMENT MANAGEMENT
-- ============================================================================

-- Function to calculate appointment duration in minutes
CREATE OR REPLACE FUNCTION calculate_appointment_duration()
RETURNS TRIGGER AS $$
BEGIN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_appointments_duration BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION calculate_appointment_duration();

-- Function to get contractor's upcoming appointments
CREATE OR REPLACE FUNCTION get_upcoming_appointments(contractor_uuid UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
    appointment_id UUID,
    title VARCHAR,
    client_name VARCHAR,
    appointment_date DATE,
    start_time TIME,
    end_time TIME,
    location_type VARCHAR,
    status VARCHAR,
    job_title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        COALESCE(u.first_name || ' ' || u.last_name, a.client_name),
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.location_type,
        a.status,
        j.title
    FROM appointments a
    LEFT JOIN users u ON a.client_id = u.id
    LEFT JOIN jobs j ON a.job_id = j.id
    WHERE a.contractor_id = contractor_uuid
        AND a.appointment_date >= CURRENT_DATE
        AND a.appointment_date <= CURRENT_DATE + days_ahead
        AND a.status IN ('scheduled', 'confirmed')
    ORDER BY a.appointment_date, a.start_time;
END;
$$ LANGUAGE plpgsql;

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    contractor_uuid UUID,
    appt_date DATE,
    appt_start_time TIME,
    appt_end_time TIME,
    exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE contractor_id = contractor_uuid
        AND appointment_date = appt_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (id IS DISTINCT FROM exclude_appointment_id)
        AND (
            (start_time, end_time) OVERLAPS (appt_start_time, appt_end_time)
        );

    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. HELPER VIEWS
-- ============================================================================

-- View for contractor schedule overview
CREATE OR REPLACE VIEW contractor_schedule_overview AS
SELECT
    a.contractor_id,
    a.appointment_date,
    COUNT(*) as total_appointments,
    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
    SUM(a.duration_minutes) as total_minutes
FROM appointments a
WHERE a.status NOT IN ('cancelled', 'no_show')
GROUP BY a.contractor_id, a.appointment_date;

COMMENT ON VIEW contractor_schedule_overview IS 'Aggregated view of contractor appointments by date';

-- ============================================================================
-- 8. GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contractor_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointment_slots TO authenticated;
GRANT SELECT ON contractor_schedule_overview TO authenticated;
